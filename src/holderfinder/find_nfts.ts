import { writeJsonFile } from '../common/file_utils.js';
import { sleep } from '../common/misc_utils.js';
import * as Config from './config.js';
import { apiRequestIndexer, makeFilePath } from './utils.js';

/**
 * Retrieves all NFTs and their owners for a set of collections.
 * It outputs one .json file per collection: `${collection.name}.nfts.json`.
 * (It takes ~23 minutes to fetch 39,653 NFTs from 9 collections.)
 */

async function fetchNfts(collectionId: string, offset: number): Promise<any[]> {
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
    const result = await apiRequestIndexer(query);
    if (!result?.data?.sui?.nfts) {
        throw new Error(`[fetchNfts] unexpected result: ${JSON.stringify(result)}`);
    }
    return result.data.sui.nfts;
}

(async () => {
    for (const collection of Config.collections) {
        const nfts = new Array<any>();
        while (true) {
            console.log(`fetching ${collection.name} nfts from ${nfts.length}`);
            const results = await fetchNfts(collection.indexerId, nfts.length);
            if (results.length === 0) { // no more nfts
                break;
            }
            for (let item of results) {
                nfts.push(item); // TODO normalizeSuiAddress()
            }
            await sleep(580); // avoid hitting the 100 req/min rate limit
        }

        const filename = `find_nfts.${collection.name}.json`;
        await writeJsonFile(makeFilePath(filename), nfts);
    }
})();
