import { apiRequestIndexer, sleep, validateAndNormalizeSuiAddress } from "@polymedia/suitcase-core";
import { readJsonFile, writeJsonFile } from "@polymedia/suitcase-node";
import { ZuiCommand } from "../types.js";

// Note: it took ~23 minutes to fetch 39,653 NFTs from 9 collections

type Collection = {
    name: string;
    indexerId: string;
};

export class FindNftsCommand implements ZuiCommand {
    private inputFile = "./data/nft-collections.json";
    private outputDir = "./data";

    public getDescription(): string {
        return "Find all NFTs and their owners for a set of collections via Indexer.xyz";
    }

    public getUsage(): string {
        return `${this.getDescription()}
\nIt outputs one JSON file per collection: find-nfts.[collection].json

Usage:
  find-nfts INPUT_FILE OUTPUT_DIR

Arguments:
  INPUT_FILE    JSON file with collection names and Indexer.xyz collection IDs. Format:
                [ { name: string, indexerId: string, }, ... ]
                * You can find collection IDs on https://www.indexer.xyz: search for
                the collection you want, click "Code", and look for "collection_id".
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
  find-nfts collections.json ./data
`;
    }

    public async execute(args: string[]): Promise<void>
    {
        /* Read API credentials */

        const indexerApiUser = process.env.INDEXER_API_USER;
        const indexerApiKey = process.env.INDEXER_API_KEY;

        if (!indexerApiUser || !indexerApiKey) {
            console.error("Error: Missing required environment variables.");
            return;
        }

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

        const collections = readJsonFile<Collection[]>(this.inputFile);
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
            const filePath = `${this.outputDir}/find-nfts.${collection.name}.json`;
            writeJsonFile(filePath, nfts);
        }
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
