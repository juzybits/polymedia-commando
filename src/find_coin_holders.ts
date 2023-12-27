import { writeJsonFile } from './common/file_utils.js';
import { AddressAndBalance } from './types.js';

const IS_DEV = false;

let COIN_TYPE = '';
let OUTPUT_FILE = './data/find_coin_holders.json';
const LIMIT = IS_DEV ? 3 : 999999;

const USAGE = `
Find Coin<T> holders using the Suiscan API

Usage: pnpm find_coin_holders <COIN_TYPE> [OUTPUT_FILE]

Arguments:
  COIN_TYPE     - Required. The T in Coin<T>
  OUTPUT_FILE   - Optional. Path to the output file. Default is ${OUTPUT_FILE}'

Example:
  pnpm find_coin_holders 0x123::lol::LOL ./custom/output.json
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
    OUTPUT_FILE = args[1] || OUTPUT_FILE;
    console.log(`COIN_TYPE: ${COIN_TYPE}`);
    console.log(`OUTPUT_FILE: ${OUTPUT_FILE}`);

    /* Fetch */

    const URL_HOLDERS = `https://suiscan.xyz/api/sui-backend/mainnet/api/coins/${COIN_TYPE}/holders?sortBy=AMOUNT&orderBy=DESC&searchStr=&page=0&size=${LIMIT}`;
    const resp: ApiResponse = await fetch(URL_HOLDERS)
    .then((response: Response) => {
        if (!response.ok)
            throw new Error(`HTTP error: ${response.status}`);
        return response.json();
    })
    .then((result: ApiResponse) => {
        return result;
    });

    const isValidResponse =
        (resp.first) && // it's the first page
        (resp.last || IS_DEV) && // and also the last page
        (resp.totalPages === 1 || IS_DEV) && // this is the only page
        (!resp.empty) && // the page is not empty
        (resp.totalElements === resp.numberOfElements || IS_DEV) // all holders are included in this one page
    ;
    if (!isValidResponse) {
        console.error('Error: Unexpected response:\n'+
            `resp.first: ${resp.first}\n` +
            `resp.last: ${resp.last}\n` +
            `resp.totalPages: ${resp.totalPages}\n` +
            `resp.empty: ${resp.empty}\n` +
            `resp.totalElements: ${resp.totalElements}\n` +
            `resp.numberOfElements: ${resp.numberOfElements}`
        );
        return;
    }

    const output = new Array<AddressAndBalance>();
    for (const holder of resp.content) {
        output.push({
            address: holder.address,
            balance: holder.amount,
        });
    }

    writeJsonFile(OUTPUT_FILE, output);
}

type ApiResponse = {
    content: Holder[];

    first: boolean;
    last: boolean;
    totalPages: number;
    empty: boolean;
    totalElements: number;
    numberOfElements: number;

    number: number;
    size: number;
    sort: any;
    pageable: any;
};

type Holder =  {
    address: string;
    holderName: null | string;
    holderImg: null | string;
    amount: number;
    usdAmount: number;
    percentage: number;
    countObjects: number;
    coinType: string;
    denom: string;
};

main();

export { };
