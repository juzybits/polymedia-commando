import { bcs } from "@mysten/sui/bcs";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { coinWithBalance, Transaction } from "@mysten/sui/transactions";
import {
    balanceToString,
    chunkArray,
    formatNumber,
    NetworkName,
    newSignTx,
    sleep,
    stringToBalance,
    SuiClientBase,
    validateAndNormalizeAddress
} from "@polymedia/suitcase-core";
import {
    fileExists,
    getActiveEnv,
    getActiveKeypair,
    promptUser,
    readCsvFile,
} from "@polymedia/suitcase-node";
import { appendFileSync } from "fs";

// === config ===

/**
 * The Polymedia Bulksender package ID which contains the bulksender::send() function
 */
const PACKAGE_IDS = new Map<NetworkName, string> ([
    ["localnet", ""],
    ["devnet", ""],
    ["testnet", "0x7f541b25c64aa2d0330a64dfaeb7c0e35924b6633069b8047125e038728d15d6"],
    ["mainnet", "0x026b2b422e630c79c961fdb5d63821547ec8fb2ad5b7095189c440e1bdbba9f1"],
]);
/**
 * How many addresses to include in each transaction block.
 * It breaks above 511 addresses per PTB. You'll get this error if BATCH_SIZE is too high:
 * "JsonRpcError: Error checking transaction input objects: SizeLimitExceeded"
 */
const BATCH_SIZE = 500;
/**
 * How long to sleep between RPC requests, in milliseconds.
 * The public RPC rate limit is 100 requests per 30 seconds according to
 * https://docs.sui.io/references/sui-api/rpc-best-practices
 */
const RATE_LIMIT_DELAY = 334;
/**
 * To estimate total gas costs
 */
const GAS_PER_ADDRESS = 0.0013092459;

/// === command ===

export async function bulksend(
    coinType: string,
    inputFile: string,
    outputFile: string,
): Promise<void>
{
    try {
        // Check input and output files
        console.log(`Input file: ${inputFile}`);
        console.log(`Output file: ${outputFile}`);
        if (!fileExists(inputFile)) {
            throw new Error(`${inputFile} doesn't exist. Create a .csv file with two columns: address and amount.`);
        }
        if (fileExists(outputFile)) {
            throw new Error(`${outputFile} already exists. Check and handle it before rerunning the script.`);
        }

        // Initialize SuiClient
        const [networkName, signer] = await Promise.all([
            getActiveEnv(),
            getActiveKeypair(),
        ]);
        const suiClient = new SuiClient({ url: getFullnodeUrl(networkName)});
        const client = new SuiClientBaseWrapper({
            suiClient,
            signTx: newSignTx(suiClient, signer),
        });
        const activeAddress = signer.toSuiAddress();
        console.log(`Active network: ${networkName}`);
        console.log(`Active address: ${activeAddress}`);

        // Check coin metadata
        console.log(`Coin type: ${coinType}`);
        const coinMeta = await suiClient.getCoinMetadata({ coinType });
        if (!coinMeta) {
            throw new Error(`Failed to get CoinMetadata for coin type "${coinType}"`);
        }
        const coinSymbol = coinMeta.symbol;
        const coinDecimals = coinMeta.decimals;
        console.log(`Coin symbol: ${coinSymbol}`);
        console.log(`Coin decimals: ${coinDecimals}`);

        // Get user coinType balance
        const userBalance = BigInt(
            (await suiClient.getBalance({ owner: activeAddress, coinType })).totalBalance
        );
        console.log(`User balance: ${balanceToString(userBalance, coinDecimals)} ${coinSymbol}`);

        // Read addresses and amounts from input file
        function parseCsvLine(values: string[]): AddressBalancePair | null {
            const [addressStr, amountStr] = values;

            const address = validateAndNormalizeAddress(addressStr);

            if (address === null) {
                console.debug(`[parseCsvLine] Skipping line with invalid owner: ${addressStr}`);
                return null;
            }

            const balance = stringToBalance(amountStr, coinDecimals);

            return { address, balance };
        }
        const addrsAndBals = readCsvFile<AddressBalancePair>(inputFile, parseCsvLine);
        console.log(`\nFound ${addrsAndBals.length} addresses in ${inputFile}`);
        const batches = chunkArray(addrsAndBals, BATCH_SIZE);
        console.log(`Airdrop will be done in ${batches.length} transaction blocks`);
        console.log(`Gas estimate: ${formatNumber(GAS_PER_ADDRESS*addrsAndBals.length)} SUI`);
        // TODO: abort if current gas is lower than gas estimate
        const totalBalance = addrsAndBals.reduce((sum, pair) => sum + pair.balance, BigInt(0));
        console.log(`Total amount to be sent: ${balanceToString(totalBalance, coinDecimals)} ${coinSymbol}`);

        // Abort if user doesn't have enough balance
        if (totalBalance > userBalance) {
            throw new Error("Total amount to be sent is bigger than user balance");
        }

        // Get user confirmation before proceeding
        const userConfirmed = await promptUser("\nDoes this look okay? (y/n) ");
        if (!userConfirmed) {
            console.log("Execution aborted by the user.");
            return;
        }

        /* Send Coin<T> to each address */

        let totalGas = 0;
        let batchNumber = 0;
        try {
            const packageId = PACKAGE_IDS.get(networkName);
            for (const batch of batches)
            {
                batchNumber++;
                const batchBalance = batch.reduce((total, pair) => total + pair.balance, BigInt(0));
                logTransactionStart(outputFile, batchBalance, batchNumber, batch);

                const tx = new Transaction();
                const payCoin = coinWithBalance({
                    type: coinType,
                    balance: batchBalance,
                });
                tx.moveCall({
                    target: `${packageId}::bulksender::send`,
                    typeArguments: [ coinType ],
                    arguments: [
                        payCoin,
                        tx.pure(bcs.vector(bcs.U64).serialize(
                            batch.map(pair => pair.balance)
                        )),
                        tx.pure(bcs.vector(bcs.Address).serialize(
                            batch.map(pair => pair.address)
                        )),
                    ],
                });

                const result = await client.signAndExecuteTx(tx);

                if (result.effects?.status.status !== "success") {
                    throw new Error(`Transaction status was '${result.effects?.status.status}': ${result.digest}`);
                }

                if (result.effects?.created?.length !== batch.length) {
                    throw new Error(`Transaction created ${result.effects?.created?.length} objects `
                    + `for ${batch.length} addresses: ${result.digest}`);
                }

                logText(outputFile, `Transaction successful: ${result.digest}`);

                const gas = result.effects.gasUsed;
                totalGas += Number(gas.computationCost) + Number(gas.storageCost) - Number(gas.storageRebate);

                // Wait a bit to stay below the public RPC rate limit
                if (networkName !== "localnet") {
                    await sleep(RATE_LIMIT_DELAY);
                }
            }
            console.log("\nDone!");
            console.log(`Gas used: ${totalGas / 1_000_000_000} SUI\n`);
        }
        catch (error) {
            logText(outputFile, String(error));
            throw(error);
        }
    } catch (error) {
        console.error(error);
    }
}

// === types ===

type AddressBalancePair = {
    address: string;
    balance: bigint;
};

// === helpers ===

/**
 * Output looks like this:
 * ```
 * 2023-12-06T09:42:05.963Z - Sending to batch 1 (500 addresses): 0x326c, 0x445e, ...
 * ```
 */
function logTransactionStart(
    outputFile: string,
    batchAmount: bigint,
    batchNumber: number,
    batch: AddressBalancePair[],
): void {
    const shortText = `Sending ${batchAmount} to batch ${batchNumber} (${batch.length} addresses)`;
    console.log(shortText);
    const addresses = batch.map(pair => pair.address.substring(0, 6)).join(", ");
    const longText = `${shortText}: ${addresses}`;
    logText(outputFile, longText);
}

function logText(
    outputFile: string,
    text: string,
): void {
    const date = new Date().toISOString();
    const logEntry = `${date} - ${text}\n`;
    appendFileSync(outputFile, logEntry);
}

class SuiClientBaseWrapper extends SuiClientBase {}
