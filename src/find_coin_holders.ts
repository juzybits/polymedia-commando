const USAGE = `
Find Coin<T> holders using the Suiscan API

Usage: pnpm find_coin_holders <COIN_TYPE> [OUTPUT_FILE]

Arguments:
  COIN_TYPE     - Required. The T in Coin<T>
  OUTPUT_FILE   - Optional. Path to the output CSV file. Default is ./data/find_coin_holders.csv'

Example:
  pnpm find_coin_holders 0x123::lol::LOL ./custom/output.csv
`;

let COIN_TYPE = '';
let OUTPUT_FILE = './data/find_coin_holders.csv';
const LIMIT = 3; // TODO: change to 99999 when done

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
    OUTPUT_FILE = args[1] || OUTPUT_FILE;
    console.log(`COIN_TYPE: ${COIN_TYPE}`);
    console.log(`OUTPUT_FILE: ${OUTPUT_FILE}`);

    /* Fetch */

    const URL_HOLDERS = `https://suiscan.xyz/api/sui-backend/mainnet/api/coins/${COIN_TYPE}/holders?sortBy=AMOUNT&orderBy=DESC&searchStr=&page=0&size=${LIMIT}`;
    const result = await fetch(URL_HOLDERS)
    .then((response: Response) => {
        if (!response.ok)
            throw new Error(`HTTP error: ${response.status}`);
        return response.json();
    })
    .then((result: any) => {
        return result;
    });
    console.log(result);
}

main();

export {};
