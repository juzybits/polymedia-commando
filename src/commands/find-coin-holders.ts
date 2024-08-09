import { writeJsonFile } from "@polymedia/suitcase-node";
import { AddressAndBalance } from "../types.js";

const IS_DEV = false;

export class FindCoinHoldersCommand
{
    private coinType = "";
    private outputFile = "";
    private limit = IS_DEV ? 3 : 999999;

    public async execute(args: string[]): Promise<void>
    {
        /* Read command arguments */

        this.coinType = args[0];
        this.outputFile = args[1];
        console.log(`coinType: ${this.coinType}`);
        console.log(`outputFile: ${this.outputFile}`);

        /* Fetch holders */

        const urlHolders = `https://suiscan.xyz/api/sui-backend/mainnet/api/coins/${this.coinType}/holders?sortBy=AMOUNT&orderBy=DESC&searchStr=&page=0&size=${this.limit}`;
        const resp: ApiResponse = await fetch(urlHolders)
        .then((response: Response) => {
            if (!response.ok)
                throw new Error(`HTTP error: ${response.status}`);
            return response.json() as Promise<ApiResponse>;
        });

        const isValidResponse =
            (resp.first) && // it's the first page
            (resp.last || IS_DEV) && // and also the last page
            (resp.totalPages === 1 || IS_DEV) && // this is the only page
            (!resp.empty) && // the page is not empty
            (resp.totalElements === resp.numberOfElements || IS_DEV) // all holders are included in this one page
        ;
        if (!isValidResponse) {
            console.error("Error: Unexpected response:\n"+
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
