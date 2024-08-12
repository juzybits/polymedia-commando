import { apiRequestIndexer, sleep, validateAndNormalizeSuiAddress } from "@polymedia/suitcase-core";
import { readJsonFile } from "@polymedia/suitcase-node";
import { writeFileSync } from "fs";

type Collection = {
    name: string;
    indexerId: string;
};

export async function findNftHolders(
    inputFile: string,
    outputDir: string,
): Promise<void>
{
    /* Read API credentials */

    const indexerApiUser = process.env.INDEXER_API_USER ?? atob("dHJhZGVwb3J0Lnh5eg==");
    const indexerApiKey = process.env.INDEXER_API_KEY ?? atob("dm1xVnU1ay5mZTAwZjZlMzEwM2JhNTFkODM1YjIzODJlNjgwOWEyYQ==");

    if (!indexerApiUser || !indexerApiKey) {
        console.error("Error: Missing required environment variables.");
        return;
    }

    console.log(`inputFile: ${inputFile}`);
    console.log(`outputDir: ${outputDir}`);

    /* Find NFT holders */

    const collections = readJsonFile<Collection[]>(inputFile);
    for (const collection of collections) {
        const holders = new Set<string>();
        let offset = 0;
        while (true) {
            console.log(`fetching ${collection.name} holders from ${offset}`);
            const results = await fetchHolders(collection.indexerId, offset, indexerApiUser, indexerApiKey);
            if (results.length === 0) { // no more holders
                break;
            }
            for (const item of results) {
                offset++;
                const address = item.owner && validateAndNormalizeSuiAddress(item.owner);
                if (address) {
                    holders.add(address);
                } else {
                    console.log(`skipping null ${collection.name} holder`);
                }
            }
            await sleep(580); // avoid hitting the 100 req/min rate limit
        }

        const filePath = `${outputDir}/find-nft-holders.${collection.name}.txt`;
        const contents = [...holders].join("\n");
        writeFileSync(filePath, contents + "\n");
    }
}

async function fetchHolders(
    collectionId: string,
    offset: number,
    indexerApiUser: string,
    indexerApiKey: string,
): Promise<any[]> {
    const query = `
    query {
        sui {
            nfts(
                where: {
                    collection: { id: { _eq: "${collectionId}" } }
                },
                distinct_on: [ owner ]
                offset: ${offset}
            ) {
                owner
            }
        }
    }
    `;
    const result = await apiRequestIndexer<any>(indexerApiUser, indexerApiKey, query);
    if (!result?.data?.sui?.nfts) {
        throw new Error(`[fetchHolders] unexpected result: ${JSON.stringify(result)}`);
    }
    return result.data.sui.nfts;
}
