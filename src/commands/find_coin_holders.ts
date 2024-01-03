import { writeJsonFile } from '../utils/file_utils.js';
import { AddressAndBalance, Command } from '../types.js';

const IS_DEV = false;

export class FindCoinHoldersCommand extends Command {
    private coinType = '';
    private outputFile = './data/find_coin_holders.json';
    private limit = IS_DEV ? 3 : 999999;

    constructor(args: string[]) {
        super(args);
        this.coinType = args[0] || this.coinType;
        this.outputFile = args[1] || this.outputFile;
    }

    public getDescription(): string {
        return 'Find Coin<T> holders using the Suiscan API';
    }

    public getUsage(): string {
        return `${this.getDescription()}

Usage:
  find_coin_holders <COIN_TYPE> [OUTPUT_FILE]

Arguments:
  COIN_TYPE     - Required. The T in Coin<T>
  OUTPUT_FILE   - Optional. Path to the output file. Default is ${this.outputFile}'

Example:
  find_coin_holders 0x123::lol::LOL ./custom/output.json
`;
    }

    public async execute(): Promise<void>
    {
        console.log(`coinType: ${this.coinType}`);
        console.log(`outputFile: ${this.outputFile}`);

        const urlHolders = `https://suiscan.xyz/api/sui-backend/mainnet/api/coins/${this.coinType}/holders?sortBy=AMOUNT&orderBy=DESC&searchStr=&page=0&size=${this.limit}`;
        const resp: ApiResponse = await fetch(urlHolders)
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

        writeJsonFile(this.outputFile, output);
    }

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
