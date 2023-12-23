import { readJsonFile, writeJsonFile } from './common/file_utils.js';
import { SuiClientRotator, SuiClientWithEndpoint } from './common/sui_utils.js';
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

    /* Find how much Coin<T> is owned by each address */

    const inputs: AddressAndBalance[] = readJsonFile(INPUT_FILE);
    console.log(`Fetching ${inputs.length} balances in batches...`);

    const rotator = new SuiClientRotator();
    const fetchBalance = (client: SuiClientWithEndpoint, input: AddressAndBalance) => {
        return client.getBalance({
            owner: input.address,
            coinType: COIN_TYPE,
        }).then(balance => {
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
    };
    const balances = await rotator.executeInBatches(inputs, fetchBalance);

    writeJsonFile(OUTPUT_FILE, balances);
}

main();

export { };
