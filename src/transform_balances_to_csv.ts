import { readJsonFile, writeCsvFile } from './common/file_utils.js';
import { AddressAndBalance } from './types.js';

let DECIMALS: number;
let INPUT_FILE = './data/find_coin_balances.json';
let OUTPUT_FILE = './data/transform_balances_to_csv.csv';

const USAGE = `
Usage: pnpm transform_balances_to_csv DECIMALS [INPUT_FILE] [OUTPUT_FILE]

Arguments:
  DECIMALS     - Number of decimals for Coin<T>
  INPUT_FILE   - Optional. Path to the input file. Default is ${INPUT_FILE}'
  OUTPUT_FILE  - Optional. Path to the output file. Default is ${OUTPUT_FILE}'

Example:
  pnpm transform_balances_to_csv ./custom/input.json ./custom/output.json
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

    DECIMALS = Number(args[0]);
    const decimalsDivider = 10**DECIMALS;
    INPUT_FILE = args[1] || INPUT_FILE;
    OUTPUT_FILE = args[2] || OUTPUT_FILE;
    console.log(`DECIMALS: ${DECIMALS}`);
    console.log(`INPUT_FILE: ${INPUT_FILE}`);
    console.log(`OUTPUT_FILE: ${OUTPUT_FILE}`);

    /* Find how much Coin<T> is owned by each address */

    const inputs: AddressAndBalance[] = readJsonFile(INPUT_FILE);
    const lines: (string|number)[][] = [];
    lines.push(['address', 'balance']);
    for (const input of inputs) {
        if (input.balance == 0) {
            continue;
        }
        lines.push([input.address, input.balance / decimalsDivider]);
    }
    writeCsvFile(OUTPUT_FILE, lines);
}

main();

export { };
