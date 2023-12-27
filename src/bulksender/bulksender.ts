import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { appendFileSync } from 'fs';
import { fileExists, readCsvFile } from '../common/file_utils.js';
import { chunkArray, formatNumber, promptUser, sleep } from '../common/misc_utils.js';
import { getActiveAddressKeypair, getActiveEnv, validateAndNormalizeSuiAddress } from '../common/sui_utils.js';
import { excludedOwners } from './config.js';

const USAGE = `
Usage: pnpm send <COIN_ID> [INPUT_FILE] [OUTPUT_FILE]

Arguments:
  COIN_ID     - Required. The Coin<T> identifier to pay for the airdrop
  INPUT_FILE  - Optional. Path to the input file. Default is ./data/bulksender.input.csv'
  OUTPUT_FILE - Optional. Path to the output file. Default is ./data/bulksender.output.csv'

Example:
  pnpm send 0x1234abdc ./custom/input.csv ./custom/output.csv
`;

function printUsage() {
    console.log(USAGE);
}

/**
 * The Coin<T> to pay for the airdrop. Must be owned by the current `sui client active-address`.
 */
let COIN_ID = '';
/**
 * A list of airdrop recipients and amounts *WITHOUT DECIMALS*. For example, for a Coin<SUI> airdrop:
 *      0x123,25
 *      0x567,33
 * would airdrop 25_000_000_000 SUI to address 0x123 (5 * 10^9 MIST)
 */
let INPUT_FILE = './data/bulksender.input.csv';
/**
 * A log file with details about transactions sent/failed.
 */
let OUTPUT_FILE = './data/bulksender.output.csv';
/**
 * How many addresses (split_and_transfer() calls) to include in each transaction block.
 * On localnet it breaks above 191 calls per PTB.
 * On testnet it breaks around  95 calls per PTB (it varies).
 * If you get a "TypeError: fetch failed" response with "code: 'UND_ERR_SOCKET'",
 * likely it is because BATCH_SIZE is too high.
 */
const BATCH_SIZE = 85;
/**
 * How long to sleep between RPC requests, in milliseconds.
 * The public RPC rate limit is 100 requests per 30 seconds according to
 * https://docs.sui.io/references/sui-api/rpc-best-practices
 */
const RATE_LIMIT_DELAY = 500;

async function main() {
    try {
        /* Read and validate inputs */

        // Process command line arguments

        const args = process.argv.slice(2);

        if (args.includes('-h') || args.includes('--help')) {
            printUsage();
            return;
        }

        if (args.length < 1) {
            console.error(`Error: COIN_ID is required as the first argument.`);
            printUsage();
            return;
        }

        COIN_ID = args[0];
        INPUT_FILE = args[1] || INPUT_FILE;
        OUTPUT_FILE = args[2] || OUTPUT_FILE;
        console.log(`Input file: ${INPUT_FILE}`);
        console.log(`Output file: ${OUTPUT_FILE}`);

        // Abort if the output file already exists, to prevent double-runs
        if (fileExists(OUTPUT_FILE)) {
            throw new Error(`${OUTPUT_FILE} already exists. Check and handle it before rerunning the script.`);
        }

        // Abort if the input file doesn't exist
        if (!fileExists(INPUT_FILE)) {
            throw new Error(`${INPUT_FILE} doesn't exist. Create a .csv file with two columns: address and amount.`);
        }

        console.log(`Excluded addresses: ${excludedOwners.length}`);

        // Create a SuiClient instance for the current `sui client active-env`
        const networkName = getActiveEnv();
        console.log(`Active network: ${networkName}`);
        const suiClient = new SuiClient({ url: getFullnodeUrl(networkName)});

        // Get the keypair for the current `sui client active-address`
        const signer = getActiveAddressKeypair();
        const activeAddress = signer.toSuiAddress();
        console.log(`Active address: ${activeAddress}`)

        // Abort if COIN_ID doesn't exist
        console.log(`COIN_ID: ${COIN_ID}`);
        const coinObject = await suiClient.getObject({
            id: COIN_ID,
            options: {
                showContent: true,
                showOwner: true,
            },
        });
        if (coinObject.error || coinObject.data?.content?.dataType !== 'moveObject') {
            throw new Error(`COIN_ID object doesn't exist on this network`);
        }

        // Abort if the user doesn't own COIN_ID
        if (activeAddress !== (coinObject.data as any).owner.AddressOwner) {
            throw new Error(`Your active address doesn't own COIN_ID`);
        }

        // Get COIN_ID type (the `T` in `Coin<T>`)
        const coinTypeFull = coinObject.data.content.type; // e.g. "0x2::coin::Coin<0x2::sui::SUI>"
        const match = coinTypeFull.match(/<([^>]+)>/); // extract "0x2::sui::SUI" from the full type
        if (!match) {
            throw new Error(`Failed to parse the Coin type from the object type: ${coinTypeFull}`);
        }
        const coinType = match[1];
        console.log(`COIN_ID type: ${coinType}`);

        // Get COIN_ID symbol and decimals
        const coinMetadata = await suiClient.getCoinMetadata({ coinType });
        if (!coinMetadata) {
            throw new Error(`Failed to get CoinMetadata for COIN_ID type`);
        }
        const coinSymbol = coinMetadata.symbol;
        const coinDecimals = coinMetadata.decimals;
        const decimalMultiplier = BigInt(10**coinDecimals);
        console.log(`COIN_ID symbol: ${coinSymbol}`);
        console.log(`COIN_ID decimals: ${coinDecimals}`);

        // Get COIN_ID balance
        const coinBalanceDecimals = BigInt((coinObject.data.content.fields as any).balance);
        const coinBalanceNoDecimals = coinBalanceDecimals / decimalMultiplier;
        console.log(`COIN_ID balance: ${formatNumber(coinBalanceNoDecimals)} (${formatNumber(coinBalanceDecimals)})`);

        // Read addresses and amounts from input file
        const addressAmountPairs = readCsvFile<AddressAmountPair>(INPUT_FILE, parseCsvLine);
        const totalAmountNoDecimals = addressAmountPairs.reduce((sum, pair) => sum + pair.amount, BigInt(0));
        const totalAmountDecimals = totalAmountNoDecimals * decimalMultiplier;
        console.log(`Found ${addressAmountPairs.length} addresses in ${INPUT_FILE}`);
        console.log(`Total amount to be sent: ${formatNumber(totalAmountNoDecimals)} (${formatNumber(totalAmountDecimals)})`);

        // Abort if COIN_ID doesn't have enough balance
        if (totalAmountDecimals > coinBalanceDecimals) {
            throw new Error(`Total amount to be sent is bigger than COIN_ID balance`);
        }

        // Get user confirmation before proceeding
        const userConfirmed = await promptUser('\nDoes this look okay? (y/n) ');
        if (!userConfirmed) {
            console.log('Execution aborted by the user.');
            return;
        }

        /* Send Coin<T> to each address */

        const batches = chunkArray(addressAmountPairs, BATCH_SIZE);
        let batchNumber = 0;
        try {
            for (const batch of batches) {
                batchNumber++;
                logTransactionStart(batchNumber, batch);

                const txb = new TransactionBlock();
                const coinArg = txb.object(COIN_ID);

                for (const pair of batch) {
                    const amount = pair.amount * decimalMultiplier;
                    const recipient = pair.address;
                    txb.moveCall({
                        target: '0x2::pay::split_and_transfer',
                        typeArguments: [ coinType ],
                        arguments: [ coinArg, txb.pure(amount), txb.pure(recipient) ],
                    });
                }

                const result = await suiClient.signAndExecuteTransactionBlock({
                    signer,
                    transactionBlock: txb,
                    options: {
                        showEffects: true,
                        showObjectChanges: true,
                    }
                });

                if (result.effects?.status.status !== 'success') {
                    throw new Error(`Transaction status was '${result.effects?.status.status}': ${result.digest}`);
                }

                if (result.effects?.created?.length !== batch.length) {
                    throw new Error(`Transaction created ${result.effects?.created?.length} objects `
                    + `for ${batch.length} addresses: ${result.digest}`);
                }

                logText(`Transaction successful: ${result.digest}`);

                // Wait a bit to stay below the public RPC rate limit
                await sleep(RATE_LIMIT_DELAY);
            }
        }
        catch (error) {
            logText(String(error));
            throw(error);
        }
    } catch (error) {
        console.error(error);
    }
}

type AddressAmountPair = {
    address: string;
    amount: bigint;
}

/**
 * It expects the 1st column to be the owner address and the 2nd column to be the amount to be sent.
 */
function parseCsvLine(values: string[]): AddressAmountPair | null {
    const [addressStr, amountStr] = values;

    const address = validateAndNormalizeSuiAddress(addressStr);

    if (address === null) {
        console.debug(`[parseCsvLine] Skipping line with invalid owner: ${addressStr}`);
        return null;
    }

    if (excludedOwners.includes(address)) {
        console.debug(`[parseCsvLine] Skipping excluded owner: ${address}`);
        return null;
    }

    const amount = BigInt(amountStr);

    return { address, amount };

}

/**
 * Output looks like this:
 * ```
 * 2023-12-06T09:42:05.963Z - Sending to batch 1 (180 addresses): 0x326c, 0x445e, ...
 * ```
 */
function logTransactionStart(batchNumber: number, batch: AddressAmountPair[]) {
    const shortText = `Sending to batch ${batchNumber} (${batch.length} addresses)`;
    console.log(shortText);
    const addresses = batch.map(pair => pair.address.substring(0, 6)).join(', ');
    const longText = `${shortText}: ${addresses}`;
    logText(longText);
}

function logText(text: string) {
    const date = new Date().toISOString();
    const logEntry = `${date} - ${text}\n`;
    appendFileSync(OUTPUT_FILE, logEntry);
}

main();

export { };
