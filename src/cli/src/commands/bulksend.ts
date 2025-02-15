import { bcs } from "@mysten/sui/bcs";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { coinWithBalance, Transaction } from "@mysten/sui/transactions";

import { balanceToString, chunkArray, NetworkName, sleep, stringToBalance, validateAndNormalizeAddress } from "@polymedia/suitcase-core";
import { fileExists, getActiveEnv, getActiveKeypair, promptUser, readCsvFile, signAndExecuteTx } from "@polymedia/suitcase-node";

import { MAX_PROGRAMMABLE_TX_COMMANDS } from "../config.js";
import { debug, log, error } from "../logger.js";

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
const MAX_FN_CALLS_PER_TX = MAX_PROGRAMMABLE_TX_COMMANDS / 2 - 1;
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
): Promise<void>
{
    // check input file exists
    debug(`Input file: ${inputFile}`);
    if (!fileExists(inputFile)) {
        error(`${inputFile} doesn't exist. Provide a CSV file with two columns: address and amount.`);
        process.exit(1);
    }

    // initialize client
    const [networkName, signer] = await Promise.all([
        getActiveEnv(),
        getActiveKeypair(),
    ]);
    const client = new SuiClient({ url: getFullnodeUrl(networkName)});
    const activeAddress = signer.toSuiAddress();
    log("Active network", networkName);
    log("Active address", activeAddress);

    // fetch coin metadata
    debug("Coin type", coinType);
    const coinMeta = await client.getCoinMetadata({ coinType });
    if (!coinMeta) {
        error("Failed to get CoinMetadata for coin type", coinType);
        process.exit(1);
    }
    const coinSymbol = coinMeta.symbol;
    const coinDecimals = coinMeta.decimals;
    debug("Coin symbol", coinSymbol);
    debug("Coin decimals", coinDecimals);

    // get user balance
    const userBalance = BigInt(
        (await client.getBalance({ owner: activeAddress, coinType })).totalBalance
    );
    const userBalanceStr = `${balanceToString(userBalance, coinDecimals)} ${coinSymbol}`;
    debug("User balance", userBalanceStr);

    // parse addresses and amounts from input file
    const addrsAndBals = readCsvFile<AddressBalancePair>(inputFile, (vals) => parseCsvLine(vals, coinDecimals));
    log("Addresses found in input file", addrsAndBals.length);

    // calculate total balance to be sent
    const totalBalance = addrsAndBals.reduce((sum, pair) => sum + pair.balance, BigInt(0));
    const totalBalanceStr = `${balanceToString(totalBalance, coinDecimals)} ${coinSymbol}`;
    log("Total amount to be sent", totalBalanceStr);
    if (totalBalance > userBalance) {
        error("Total amount to be sent is bigger than user balance");
        process.exit(1);
    }

    // split into transactions
    const batches = chunkArray(addrsAndBals, MAX_FN_CALLS_PER_TX);
    log("Transactions required", batches.length);

    // get user confirmation
    const userConfirmed = networkName !== "mainnet" || await promptUser("\nDoes this look okay? (y/n) ");
    if (!userConfirmed) {
        log("Execution aborted by the user.");
        return;
    }

    // send Coin<T> to each address
    let totalGas = 0;
    let batchNumber = 0;
    try {
        const packageId = PACKAGE_IDS.get(networkName);
        if (!packageId) {
            error("Bulksender package ID missing for network", networkName);
            process.exit(1);
        }
        for (const batch of batches)
        {
            batchNumber++;
            const batchBalance = batch.reduce((total, pair) => total + pair.balance, BigInt(0));
            const batchBalanceStr = `${balanceToString(batchBalance, coinDecimals)} ${coinSymbol}`;
            log(`Sending tx ${batchNumber}/${batches.length} (${batch.length} addresses)`, batchBalanceStr);

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

            const resp = await signAndExecuteTx({ client, tx, signer });

            if (resp.effects?.status.status !== "success") {
                error(`Transaction status was '${resp.effects?.status.status}': ${resp.digest}. Response: ${JSON.stringify(resp, null, 2)}`);
                process.exit(1);
            }

            if (resp.effects?.created?.length !== batch.length) {
                error(`Transaction created ${resp.effects?.created?.length} objects `
                + `for ${batch.length} addresses: ${resp.digest}. Response: ${JSON.stringify(resp, null, 2)}`);
                process.exit(1);
            }

            log("Transaction successful", resp.digest);

            const gas = resp.effects.gasUsed;
            totalGas += Number(gas.computationCost) + Number(gas.storageCost) - Number(gas.storageRebate);

            if (networkName !== "localnet") {
                await sleep(RATE_LIMIT_DELAY); // give the RPC a break
            }
        }
        log("Done!");
        debug(`Gas used: ${totalGas / 1_000_000_000} SUI\n`);
    }
    catch (err) {
        error("Transaction failed", String(err));
        process.exit(1);
    }
}

// === types ===

type AddressBalancePair = {
    address: string;
    balance: bigint;
};

// === helpers ===

function parseCsvLine(
    values: string[],
    decimals: number,
): AddressBalancePair | null
{
    const [addrStr, amountStr] = values;
    const address = validateAndNormalizeAddress(addrStr);
    if (address === null) {
        debug("[parseCsvLine] Skipping line with invalid owner:", addrStr);
        return null;
    }
    const balance = stringToBalance(amountStr, decimals);
    return { address, balance };
}
