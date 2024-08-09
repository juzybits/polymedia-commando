import { apiRequestIndexer, sleep, validateAndNormalizeSuiAddress } from "@polymedia/suitcase-core";
import { readJsonFile } from "@polymedia/suitcase-node";
import fs from "fs";
import { ZuiCommand } from "../types.js";

// Note: it took ~6.5 minutes to fetch 10,703 holders from 11 collections

type Collection = {
    name: string;
    indexerId: string;
};

export class FindNftHoldersCommand implements ZuiCommand
{
    private inputFile = "";
    private outputDir = "";

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

            const filePath = `${this.outputDir}/find-nft-holders.${collection.name}.txt`;
            const contents = [...holders].join("\n");
            fs.writeFileSync(filePath, contents + "\n");
        }
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
