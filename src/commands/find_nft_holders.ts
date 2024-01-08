import * as Auth from '../.auth.js';
import { Command } from '../Commando.js';
import { readJsonFile, writeTextFile } from '../lib/file_utils.js';
import { apiRequestIndexer, sleep } from '../lib/misc_utils.js';
import { validateAndNormalizeSuiAddress } from '../lib/sui_utils.js';

// Note: it took ~6.5 minutes to fetch 10,703 holders from 11 collections

type Collection = {
    name: string;
    indexerId: string;
};

export class FindNftHoldersCommand implements Command {
    private inputFile: string = '';
    private outputDir: string = '';

    public getDescription(): string {
        return 'Find NFT holders for a set of collections via Indexer.xyz';
    }

    public getUsage(): string {
        return `${this.getDescription()}
It outputs one file per collection: find_nft_holders.[collection].txt

Usage:
  find_nft_holders [INPUT_FILE] [OUTPUT_DIR]

Arguments:
  INPUT_FILE    Path to the input JSON file. It looks like this:
                [ { name: string, indexerId: string, }, ... ]
  OUTPUT_DIR    Path to the output directory

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

        const collections: Collection[] = readJsonFile(this.inputFile);
        for (const collection of collections) {
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
            await writeTextFile(filePath, contents);
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
    const result = await apiRequestIndexer(Auth.INDEXER_API_USER, Auth.INDEXER_API_KEY, query);
    if (!result?.data?.sui?.nfts) {
        throw new Error(`[fetchHolders] unexpected result: ${JSON.stringify(result)}`);
    }
    return result.data.sui.nfts;
}
