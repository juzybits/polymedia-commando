import { apiRequestIndexer, sleep, validateAndNormalizeAddress } from "@polymedia/suitcase-core";

import { debug, error } from "../logger.js";

export async function findNfts({
    type
}: {
    type: string;
}): Promise<void>
{
    const indexerApiUser = process.env.INDEXER_API_USER ?? atob("dHJhZGVwb3J0Lnh5eg==");
    const indexerApiKey = process.env.INDEXER_API_KEY ?? atob("dm1xVnU1ay5mZTAwZjZlMzEwM2JhNTFkODM1YjIzODJlNjgwOWEyYQ==");
    if (!indexerApiUser || !indexerApiKey) {
        error("missing required environment variables");
        process.exit(1);
    }

    const nfts: NftAndOwner[] = [];
    let nullHolders = 0;
    while (true) {
        const offset = nfts.length + nullHolders;
        debug("fetching holders from offset", offset);
        const results = await fetchNfts(type, offset, indexerApiUser, indexerApiKey);
        if (results.length === 0) { // no more nfts
            if (nullHolders === 0 && type.includes("::")) {
                type = type.split("::")[0];
                debug("no results found, trying again with contract ID", type);
                continue;
            }
            break;
        }
        for (const item of results) {
            const address = item.owner && validateAndNormalizeAddress(item.owner);
            if (address) {
                item.owner = address;
                nfts.push(item);
            } else {
                nullHolders++;
            }
        }
        await sleep(580); // avoid hitting the 100 req/min rate limit
    }
    debug(`skipped ${nullHolders} null ${type} holders`);
    console.log(JSON.stringify(nfts, null, 2));
}

type NftAndOwner = {
    owner: string;
    name: string;
    token_id: string;
};

async function fetchNfts(
    type: string,
    offset: number,
    indexerApiUser: string,
    indexerApiKey: string,
): Promise<NftAndOwner[]> {
    const query = `
    query {
        sui {
            nfts(
                where: {
                    collection: { slug: { _eq: "${type}" } }
                }
                offset: ${offset}
                order_by: { token_id: asc }
            ) {
                owner
                name
                token_id
            }
        }
    }
    `;
    const result = await apiRequestIndexer<any>(indexerApiUser, indexerApiKey, query);
    if (!result?.data?.sui?.nfts) {
        error("unexpected API response", JSON.stringify(result));
        process.exit(1);
    }
    return result.data.sui.nfts;
}
