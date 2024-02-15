import { apiRequestIndexer, sleep, validateAndNormalizeSuiAddress } from '@polymedia/suits';
import * as Auth from '../.auth.js';
import { Command } from '../Commando.js';
import { readJsonFile, writeTextFile } from '../utils-file.js';

// Note: it took ~6.5 minutes to fetch 10,703 holders from 11 collections

type Collection = {
    name: string;
    indexerId: string;
};

export class FindNftHoldersCommand implements Command {
    private inputFile = '';
    private outputDir = '';

    public getDescription(): string {
        return 'Find NFT holders for a set of collections via Indexer.xyz';
    }

    public getUsage(): string {
        return `${this.getDescription()}
\nIt outputs one TXT file per collection: find_nft_holders.[collection].txt

Usage:
  find_nft_holders INPUT_FILE OUTPUT_DIR

Arguments:
  INPUT_FILE    JSON file with collection names and Indexer.xyz collection IDs. Format:
                [ { name: string, indexerId: string, }, ... ]
                * You can find collection IDs on https://www.indexer.xyz: search for
                the collection you want, click "Code", and look for "collection_id".
  OUTPUT_DIR    Output directory to write the TXT files. File format:
                holder_address_1
                holder_address_2

Example:
  find_nft_holders collections.json ./data
`;
    }

    public async execute(args: string[]): Promise<void>
    {
        /* Read command arguments */

        if (args.length !== 2) {
            console.log(this.getUsage());
            return;
        }
        this.inputFile = args[0];
        this.outputDir = args[1];
        console.log(`inputFile: ${this.inputFile}`);
        console.log(`outputDir: ${this.outputDir}`);

        /* Find NFT holders */

        const collections = readJsonFile<Collection[]>(this.inputFile);
        for (const collection of collections) {
            const holders = new Set<string>();
            let offset = 0;
            while (true) {
                console.log(`fetching ${collection.name} holders from ${offset}`);
                const results = await fetchHolders(collection.indexerId, offset);
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

            const filePath = `${this.outputDir}/find_nft_holders.${collection.name}.txt`;
            const contents = [...holders].join('\n');
            writeTextFile(filePath, contents);
        }
    }
}

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
    const result = await apiRequestIndexer<any>(Auth.INDEXER_API_USER, Auth.INDEXER_API_KEY, query);
    if (!result?.data?.sui?.nfts) {
        throw new Error(`[fetchHolders] unexpected result: ${JSON.stringify(result)}`);
    }
    return result.data.sui.nfts;
}
