export async function findCoinHolders({
    coinType, limit = 999_999_999,
}: {
    coinType: string;
    limit?: number;
}): Promise<void>
{
    /* Fetch holders */

    const urlHolders = `https://n.suiscan.xyz/data/api/coins/${coinType}/holders?page=0&sortBy=AMOUNT&orderBy=DESC&size=${limit}`;
    const resp: ApiResponse = await fetch(urlHolders)
    .then((response: Response) => {
        if (!response.ok)
            throw new Error(`HTTP error: ${response.status}`);
        return response.json() as Promise<ApiResponse>;
    });

    const output: Holder[] = [];
    for (const holder of resp.content) {
        output.push({
            address: holder.address,
            amount: holder.amount,
            usdAmount: holder.usdAmount,
            percentage: holder.percentage,
        });
    }

    console.log(JSON.stringify(output, null, 2));
}

type ApiResponse = {
    content: Holder[];
    // first: boolean;
    // last: boolean;
    // totalPages: number;
    // empty: boolean;
    // totalElements: number;
    // numberOfElements: number;
    // number: number;
    // size: number;
    // sort: any;
    // pageable: any;
};

type Holder =  {
    address: string;
    amount: number;
    usdAmount: number;
    percentage: number;
    // holderName: null | string;
    // holderImg: null | string;
    // countObjects: number;
    // coinType: string;
    // denom: string;
};
