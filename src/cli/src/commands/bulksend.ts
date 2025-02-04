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

import { debug, log, error } from "../logger.js";

/**
 * The Polymedia Bulksender package ID which contains the bulksender::send() function
 */
const PACKAGE_IDS = new Map<NetworkName, string> ([
    ["localnet", "0x8bd6031ad73629d54d1426038d790d1936d26b2227c3ae813861d5911814c953"],
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
const RATE_LIMIT_DELAY = 300;

// TODO: SerialTransactionExecutor
// TODO: abort if current gas is lower than gas estimate
export async function bulksend(
    coinType: string,
    inputFile: string,
): Promise<void>
{
    // === check input and output files ===
    debug(`Input file: ${inputFile}`);
    if (!fileExists(inputFile)) {
        throw new Error(`${inputFile} doesn't exist. Create a .csv file with two columns: address and amount.`);
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
    log(`Active network: ${networkName}`);
    log(`Active address: ${activeAddress}`);

    // === check coin metadata ===
    debug(`Coin type: ${coinType}`);
    const coinMeta = await suiClient.getCoinMetadata({ coinType });
    if (!coinMeta) {
        throw new Error(`Failed to get CoinMetadata for coin type "${coinType}"`);
    }
    const coinSymbol = coinMeta.symbol;
    const coinDecimals = coinMeta.decimals;
    debug(`Coin symbol: ${coinSymbol}`);
    debug(`Coin decimals: ${coinDecimals}`);

    // === get user balance ===
    const userBalance = BigInt(
        (await suiClient.getBalance({ owner: activeAddress, coinType })).totalBalance
    );
    debug(`User balance: ${balanceToString(userBalance, coinDecimals)} ${coinSymbol}`);

    // === read addresses and amounts from input file ===
    const addrsAndBals = readCsvFile<AddressBalancePair>(inputFile, (vals) => parseCsvLine(vals, coinDecimals));
    log(`Found ${addrsAndBals.length} addresses in ${inputFile}`);

    const totalBalance = addrsAndBals.reduce((sum, pair) => sum + pair.balance, BigInt(0));
    log(`Total amount to be sent: ${balanceToString(totalBalance, coinDecimals)} ${coinSymbol}`);
    if (totalBalance > userBalance) {
        throw new Error("Total amount to be sent is bigger than user balance");
    }

    const batches = chunkArray(addrsAndBals, BATCH_SIZE);
    log(`Airdrop will be done in ${batches.length} transaction blocks`);

    // === get user confirmation ===
    const userConfirmed = networkName !== "mainnet" || await promptUser("\nDoes this look okay? (y/n) ");
    if (!userConfirmed) {
        log("Execution aborted by the user.");
        return;
    }

    // === send Coin<T> to each address ===
    let totalGas = 0;
    let batchNumber = 0;
    try {
        const packageId = PACKAGE_IDS.get(networkName);
        if (!packageId) {
            throw new Error(`Bulksender package ID missing for network "${networkName}"`);
        }
        for (const batch of batches)
        {
            batchNumber++;
            const batchBalance = batch.reduce((total, pair) => total + pair.balance, BigInt(0));
            log(`Sending ${batchBalance} to batch ${batchNumber} (${batch.length} addresses)`);

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

            log("Transaction successful", resp.digest);

            const gas = resp.effects.gasUsed;
            totalGas += Number(gas.computationCost) + Number(gas.storageCost) - Number(gas.storageRebate);

            if (networkName !== "localnet") {
                await sleep(RATE_LIMIT_DELAY); // give the RPC a break
            }
        }
        log("\nDone!");
        log(`Gas used: ${totalGas / 1_000_000_000} SUI\n`);
    }
    catch (err) {
        error("Transaction failed", String(err));
        throw err;
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
        debug(`[parseCsvLine] Skipping line with invalid owner: ${addrStr}`);
        return null;
    }
    const balance = stringToBalance(amountStr, decimals);
    return { address, balance };
}
