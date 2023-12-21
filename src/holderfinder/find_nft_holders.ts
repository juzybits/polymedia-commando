import { writeTextFile } from '../common/file_utils.js';
import { sleep } from '../common/misc_utils.js';
import * as Config from './config.js';
import { apiRequestIndexer, makeFilePath } from './utils.js';

/**
 * Retrieves the list of unique NFT holders for a set of collections.
 * It outputs one .txt file per collection: `${collection.name}.holders.txt`
 * (It takes ~6.5 minutes to fetch 10,703 holders from 11 collections.)
 */

async function fetchHolders(collectionId: string, offset: number): Promise<any[]> {
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
    const result = await apiRequestIndexer(query);
    if (!result?.data?.sui?.nfts) {
        throw new Error(`[fetchHolders] unexpected result: ${JSON.stringify(result)}`);
    }
    return result.data.sui.nfts;
}

(async () => {
    for (const collection of Config.collections) {
        const holders = new Set<string>();
        let offset = 0;
        while (true) {
            console.log(`fetching ${collection.name} holders from ${offset}`);
            const results = await fetchHolders(collection.indexerId, offset);
            if (results.length === 0) { // no more holders
                break;
            }
            for (let item of results) {
                offset++;
                holders.add(item.owner); // TODO normalizeSuiAddress()
            }
            await sleep(580); // avoid hitting the 100 req/min rate limit
        }

        const filename = `find_nft_holders.${collection.name}.txt`;
        const contents = [...holders].join('\n');
        await writeTextFile(makeFilePath(filename), contents);
    }
})();
