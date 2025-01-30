import { appendFileSync } from "fs";

import { bcs } from "@mysten/sui/bcs";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { coinWithBalance, Transaction } from "@mysten/sui/transactions";

import {
    balanceToString,
    chunkArray,
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

/**
 * The Polymedia Bulksender package ID which contains the bulksender::send() function
 */
const PACKAGE_IDS = new Map<NetworkName, string> ([
    ["localnet", ""],
    ["devnet", "0x680147436c5ca7501bdda0bc99625d097d2a7a3db48a79949d4192cb1acea3dc"],
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
const RATE_LIMIT_DELAY = 300;

// TODO: abort if current gas is lower than gas estimate
export async function bulksend(
    coinType: string,
    inputFile: string,
    outputFile: string,
): Promise<void>
{
    // === check input and output files ===
    console.log(`Input file: ${inputFile}`);
    console.log(`Output file: ${outputFile}`);
    if (!fileExists(inputFile)) {
        throw new Error(`${inputFile} doesn't exist. Create a .csv file with two columns: address and amount.`);
    }
    if (fileExists(outputFile)) {
        throw new Error(`${outputFile} already exists. Check and handle it before rerunning the script.`);
    }

    // === initialize client ===
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

    // === check coin metadata ===
    console.log(`Coin type: ${coinType}`);
    const coinMeta = await suiClient.getCoinMetadata({ coinType });
    if (!coinMeta) {
        throw new Error(`Failed to get CoinMetadata for coin type "${coinType}"`);
    }
    const coinSymbol = coinMeta.symbol;
    const coinDecimals = coinMeta.decimals;
    console.log(`Coin symbol: ${coinSymbol}`);
    console.log(`Coin decimals: ${coinDecimals}`);

    // === get user balance ===
    const userBalance = BigInt(
        (await suiClient.getBalance({ owner: activeAddress, coinType })).totalBalance
    );
    console.log(`User balance: ${balanceToString(userBalance, coinDecimals)} ${coinSymbol}`);

    // === read addresses and amounts from input file ===
    const addrsAndBals = readCsvFile<AddressBalancePair>(inputFile, (vals) => parseCsvLine(vals, coinDecimals));
    console.log(`Found ${addrsAndBals.length} addresses in ${inputFile}`);

    const batches = chunkArray(addrsAndBals, BATCH_SIZE);
    console.log(`Airdrop will be done in ${batches.length} transaction blocks`);

    const totalBalance = addrsAndBals.reduce((sum, pair) => sum + pair.balance, BigInt(0));
    console.log(`Total amount to be sent: ${balanceToString(totalBalance, coinDecimals)} ${coinSymbol}`);
    if (totalBalance > userBalance) {
        throw new Error("Total amount to be sent is bigger than user balance");
    }

    // === get user confirmation ===
    const userConfirmed = await promptUser("\nDoes this look okay? (y/n) ");
    if (!userConfirmed) {
        console.log("Execution aborted by the user.");
        return;
    }

    // === send Coin<T> to each address ===
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

            const resp = await client.signAndExecuteTx(tx);

            if (resp.effects?.status.status !== "success") {
                throw new Error(`Transaction status was '${resp.effects?.status.status}': ${resp.digest}. Response: ${JSON.stringify(resp, null, 2)}`);
            }

            if (resp.effects?.created?.length !== batch.length) {
                throw new Error(`Transaction created ${resp.effects?.created?.length} objects `
                + `for ${batch.length} addresses: ${resp.digest}. Response: ${JSON.stringify(resp, null, 2)}`);
            }

            logText(outputFile, `Transaction successful: ${resp.digest}`);

            const gas = resp.effects.gasUsed;
            totalGas += Number(gas.computationCost) + Number(gas.storageCost) - Number(gas.storageRebate);

            if (networkName !== "localnet") {
                await sleep(RATE_LIMIT_DELAY); // give the RPC a break
            }
        }
        console.log("\nDone!");
        console.log(`Gas used: ${totalGas / 1_000_000_000} SUI\n`);
    }
    catch (error) {
        logText(outputFile, String(error));
        throw error;
    }
}

// === types ===

type AddressBalancePair = {
    address: string;
    balance: bigint;
};

// === helpers ===

class SuiClientBaseWrapper extends SuiClientBase {}

function parseCsvLine(
    values: string[],
    decimals: number,
): AddressBalancePair | null
{
    const [addrStr, amountStr] = values;
    const address = validateAndNormalizeAddress(addrStr);
    if (address === null) {
        console.debug(`[parseCsvLine] Skipping line with invalid owner: ${addrStr}`);
        return null;
    }
    const balance = stringToBalance(amountStr, decimals);
    return { address, balance };
}

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
