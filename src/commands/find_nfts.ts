import { apiRequestIndexer, sleep, validateAndNormalizeSuiAddress } from '@polymedia/suits';
import * as Auth from '../.auth.js';
import { Command } from '../Commando.js';
import { readJsonFile, writeJsonFile } from '../utils-file.js';

// Note: it took ~23 minutes to fetch 39,653 NFTs from 9 collections

type Collection = {
    name: string;
    indexerId: string;
};

export class FindNftsCommand implements Command {
    private inputFile: string = './data/nft_collections.json';
    private outputDir: string = './data';

    public getDescription(): string {
        return 'Find all NFTs and their owners for a set of collections via Indexer.xyz';
    }

    public getUsage(): string {
        return `${this.getDescription()}
\nIt outputs one JSON file per collection: find_nfts.[collection].json

Usage:
  find_nfts INPUT_FILE OUTPUT_DIR

Arguments:
  INPUT_FILE    JSON file with collection names and Indexer.xyz IDs. Format:
                [ { name: string, indexerId: string, }, ... ]
  OUTPUT_DIR    Output directory to write the JSON files. File format:
                [
                    {
                        owner: string,
                        name: string,
                        token_id: string,
                    },
                    ...
                ]

Example:
  find_nfts collections.json ./data
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

        /* Find all NFTs and their owners */

        const collections: Collection[] = readJsonFile(this.inputFile);
        for (const collection of collections) {
            const nfts: NftAndOwner[] = [];
            let nullHolders = 0;
            while (true) {
                const offset = nfts.length + nullHolders;
                console.log(`fetching ${collection.name} nfts from ${offset}`);
                const results = await fetchNfts(collection.indexerId, offset);
                if (results.length === 0) { // no more nfts
                    break;
                }
                for (let item of results) {
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
            const filePath = `${this.outputDir}/find_nfts.${collection.name}.json`;
            await writeJsonFile(filePath, nfts);
        }
    }
}

type NftAndOwner = {
    owner: string;
    name: string;
    token_id: string;
};
async function fetchNfts(collectionId: string, offset: number): Promise<NftAndOwner[]> {
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
    const result = await apiRequestIndexer(Auth.INDEXER_API_USER, Auth.INDEXER_API_KEY, query);
    if (!result?.data?.sui?.nfts) {
        throw new Error(`[fetchNfts] unexpected result: ${JSON.stringify(result)}`);
    }
    return result.data.sui.nfts;
}
