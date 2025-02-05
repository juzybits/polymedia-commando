import { apiRequestIndexer, sleep } from "@polymedia/suitcase-core";

import { debug, error } from "../logger.js";

type VerifiedCollection = {
    id: string;
    title: string;
    slug: string;
    semantic_slug: string;
    floor: number;
    volume: number;
    usd_volume: number;
    supply: number;
    verified: boolean;
    discord: string | null;
    twitter: string | null;
    website: string | null;
};

type GraphQLResponse = {
    data: {
        sui: {
            collections: VerifiedCollection[];
        };
    };
};

export async function findNftVerified(): Promise<void>
{
    const indexerApiUser = process.env.INDEXER_API_USER ?? atob("dHJhZGVwb3J0Lnh5eg==");
    const indexerApiKey = process.env.INDEXER_API_KEY ?? atob("dm1xVnU1ay5mZTAwZjZlMzEwM2JhNTFkODM1YjIzODJlNjgwOWEyYQ==");
    if (!indexerApiUser || !indexerApiKey) {
        error("missing required environment variables");
        process.exit(1);
    }

    const allCollections: VerifiedCollection[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        debug("fetching verified collections from offset", offset);
        const results = await fetchVerifiedNftCollections(indexerApiUser, indexerApiKey, offset);
        allCollections.push(...results);

        if (results.length === 0) {
            hasMore = false;
        } else {
            offset += results.length;
            await sleep(580); // avoid hitting the 100 req/min rate limit
        }
    }

    debug(`total verified collections fetched: ${allCollections.length}`);
    console.log(JSON.stringify(allCollections, null, 2));
}

async function fetchVerifiedNftCollections(
    apiUser: string,
    apiKey: string,
    offset: number
): Promise<VerifiedCollection[]> {
    const query = `
    query {
        sui {
            collections(
                where: { verified: { _eq: true } }
                offset: ${offset}
                order_by: { usd_volume: desc }
            ) {
                id
                title
                slug
                semantic_slug
                floor
                volume
                usd_volume
                supply
                verified
                discord
                twitter
                website
            }
        }
    }
    `;
    const result = await apiRequestIndexer<GraphQLResponse>(apiUser, apiKey, query);
    if (!result?.data?.sui?.collections) {
        error("unexpected API response", JSON.stringify(result));
        process.exit(1);
    }
    return result.data.sui.collections;
}
