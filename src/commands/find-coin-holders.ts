import { writeJsonFile } from "@polymedia/suitcase-node";
import { AddressAndBalance } from "../types.js";

export async function findCoinHolders(
    coinType: string,
    outputFile: string,
    limit = 999_999_999,
): Promise<void>
{
    /* Fetch holders */

    const urlHolders = `https://suiscan.xyz/api/sui-backend/mainnet/api/coins/${coinType}/holders?sortBy=AMOUNT&orderBy=DESC&searchStr=&page=0&size=${limit}`;
    const resp: ApiResponse = await fetch(urlHolders)
    .then((response: Response) => {
        if (!response.ok)
            throw new Error(`HTTP error: ${response.status}`);
        return response.json() as Promise<ApiResponse>;
    });

    const output = new Array<AddressAndBalance>();
    for (const holder of resp.content) {
        output.push({
            address: holder.address,
            balance: holder.amount,
        });
    }

    writeJsonFile(outputFile, output);
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
