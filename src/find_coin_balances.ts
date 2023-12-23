import { readJsonFile, writeJsonFile } from './common/file_utils.js';
import { sleep } from './common/misc_utils.js';
import { SuiClientRotator } from './common/sui_utils.js';
import { AddressAndBalance } from './find_coin_holders.js';

let COIN_TYPE = '';
let INPUT_FILE = './data/find_coin_holders.json';
let OUTPUT_FILE = './data/find_coin_balances.json';

const USAGE = `
Find how much Coin<T> is owned by each address

Usage: pnpm find_coin_balances <COIN_TYPE> [INPUT_FILE] [OUTPUT_FILE]

Arguments:
  COIN_TYPE    - Required. The T in Coin<T>
  INPUT_FILE   - Optional. Path to the input file. Default is ${INPUT_FILE}'
  OUTPUT_FILE  - Optional. Path to the output file. Default is ${OUTPUT_FILE}'

Example:
  pnpm find_coin_balances 0x123::lol::LOL ./custom/input.json ./custom/output.json
`;

function printUsage() {
    console.log(USAGE);
}

async function main()
{
    /* Read and validate inputs */

    const args = process.argv.slice(2);

    if (args.includes('-h') || args.includes('--help')) {
        printUsage();
        return;
    }

    if (args.length < 1) {
        console.error('Error: COIN_TYPE is required as the first argument.');
        printUsage();
        return;
    }

    COIN_TYPE = args[0];
    INPUT_FILE = args[1] || INPUT_FILE;
    OUTPUT_FILE = args[2] || OUTPUT_FILE;
    console.log(`COIN_TYPE: ${COIN_TYPE}`);
    console.log(`INPUT_FILE: ${INPUT_FILE}`);
    console.log(`OUTPUT_FILE: ${OUTPUT_FILE}`);

    const inputs: AddressAndBalance[] = readJsonFile(INPUT_FILE);
    const balances = await getAllBalances(inputs);
    writeJsonFile(OUTPUT_FILE, balances);
}

const rotator = new SuiClientRotator();

// Performance notes: took 11m27s to fetch 17,352 balances (about 25 req/sec)
async function getAllBalances(inputs: AddressAndBalance[]) {
    const results = [];
    const batchSize = rotator.getNumberOfClients();
    const totalBatches = Math.ceil(inputs.length / batchSize);
    const rateLimitDelay = 334; // minimum time between batches (in milliseconds)

    console.log(`Fetching ${inputs.length} balances in batches of ${batchSize}`);

    for (let start = 0, batchNum = 1; start < inputs.length; start += batchSize, batchNum++) {
        console.log(`Fetching batch ${batchNum} of ${totalBatches}`);

        const batch = inputs.slice(start, start + batchSize);
        const startTime = Date.now();
        const batchResults = await processBatch(batch);
        const endTime = Date.now();
        results.push(...batchResults); // flatten into a single array

        const timeTaken = endTime - startTime;
        if (timeTaken < rateLimitDelay) {
            await sleep(rateLimitDelay - timeTaken);
        }
    }

    return results;
}

async function processBatch(batch: AddressAndBalance[]) {
    const promises = batch.map(input => {
        const client = rotator.getNextClient();
        return client.getBalance({
            owner: input.address,
            coinType: COIN_TYPE,
        }).then(balance => { // TODO divide by 10**coin_decimals
            return { address: input.address, balance: balance.totalBalance };
        }).catch(error => {
            console.error(`Error getting balance from rpc ${client.endpoint}:\n`, error);
            return {
                address: input.address,
                balance: null,
                rpc: client.endpoint,
                error: String(error),
            };
        });
    });
    return Promise.all(promises);
}

main();

export {};
