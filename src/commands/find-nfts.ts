import { apiRequestIndexer, sleep, validateAndNormalizeSuiAddress } from "@polymedia/suitcase-core";
import { readJsonFile, writeJsonFile } from "@polymedia/suitcase-node";

type Collection = {
    name: string;
    indexerId: string;
};

export async function findNfts(
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

    /* Read command arguments */

    console.log(`inputFile: ${inputFile}`);
    console.log(`outputDir: ${outputDir}`);

    /* Find all NFTs and their owners */

    const collections = readJsonFile<Collection[]>(inputFile);
    for (const collection of collections) {
        const nfts: NftAndOwner[] = [];
        let nullHolders = 0;
        while (true) {
            const offset = nfts.length + nullHolders;
            console.log(`fetching ${collection.name} nfts from ${offset}`);
            const results = await fetchNfts(collection.indexerId, offset, indexerApiUser, indexerApiKey);
            if (results.length === 0) { // no more nfts
                break;
            }
            for (const item of results) {
                const address = item.owner && validateAndNormalizeSuiAddress(item.owner);
                if (address) {
                    item.owner = address;
                    nfts.push(item);
                } else {
                    nullHolders++;
                }
            }
            await sleep(580); // avoid hitting the 100 req/min rate limit
        }
        console.log(`skipped ${nullHolders} null ${collection.name} holders`);
        const filePath = `${outputDir}/find-nfts.${collection.name}.json`;
        writeJsonFile(filePath, nfts);
    }
}

type NftAndOwner = {
    owner: string;
    name: string;
    token_id: string;
};
async function fetchNfts(
    collectionId: string,
    offset: number,
    indexerApiUser: string,
    indexerApiKey: string,
): Promise<NftAndOwner[]> {
    const query = `
    query {
        sui {
            nfts(
                where: {
                    collection: { id: { _eq: "${collectionId}" } }
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
        throw new Error(`[fetchNfts] unexpected result: ${JSON.stringify(result)}`);
    }
    return result.data.sui.nfts;
}
