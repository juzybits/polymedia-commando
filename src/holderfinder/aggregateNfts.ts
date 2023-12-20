import { normalizeSuiAddress } from '@mysten/sui.js/utils';
import * as Config from './config.js';
import { readJsonFile, writeCsvFile } from './utils.js';

/**
 * Aggregates the .json files produced by fetchNfts.
 * It outputs one .csv file which includes all holders and collections: `all.aggregate.csv`,
 * showing how many NFTs each holder owns for each collection, and how many coins
 * they are entitled to according to the allocations defined in config.ts.
 */

type Owner = string; // A Sui address that holds NFTs
type CollectionName = string; // The name of an NFT collection
type Count = number; // How many NFTs an Owner holds for a particular collection

(async () => {
    const allCollectionCounts = new Map<Owner, Map<CollectionName, Count>>();
    for (const collection of Config.collections) {
        const collectionCounts = new Map<Owner, Count>();
        console.log(`aggregating ${collection.name}`);

        const inputFilename = `${collection.name}.nfts.json`;
        const nfts: any[] = await readJsonFile(inputFilename);
        let nullOwners = 0;
        for (const nft of nfts) {
            let owner = nft.owner;
            if (owner === null) {
                nullOwners++;
            } else {
                owner = normalizeSuiAddress(nft.owner);
            }
            let count = collectionCounts.get(owner) || 0;
            count++;
            collectionCounts.set(owner, count)
        }
        if (nullOwners > 0) {
            console.warn(`warning: found ${nullOwners} null owners`);
        }

        /*
        // write the CSV file: ${collection.name}.aggregate.csv
        const lines: Array<Array<string|number>> = [];
        for (const [owner, count] of collectionCounts) {
            lines.push([collection.name, owner, count]);
        }
        const filename = `${collection.name}.aggregate.csv`;
        writeCsvFile(filename, lines);
        */

        // add to `allCollectionCounts`
        for (const [owner, count] of collectionCounts) {
            const ownerCollections = allCollectionCounts.get(owner) || new Map<string, number>();
            ownerCollections.set(collection.name, count);
            allCollectionCounts.set(owner, ownerCollections);
        }
    }

    // write the CSV file: all.aggregate.csv
    const csvHeaders = [
        'owner',
        'total_allocation',
        ...Config.collections.flatMap(collection => [
            `${collection.name}_holdings`,
            `${collection.name}_allocation`
        ]),
    ];
    const csvLines: Array<Array<string|number>> = [ csvHeaders ];
    for (const [owner, countsByCollection] of allCollectionCounts) {
        let totalAllocation = 0;
        const csvLine: Array<string|number> = [ owner ];

        for (const collection of Config.collections) {
            const collHoldings = countsByCollection.get(collection.name) || 0;
            const collAllocation = collHoldings * collection.allocationPerNft;
            totalAllocation += collAllocation;

            csvLine.push(collHoldings);
            csvLine.push(collAllocation);
        }

        csvLine.splice(1, 0, totalAllocation); // insert total allocation in the second CSV column
        csvLines.push(csvLine);
    }
    const filename = 'all.aggregate.csv';
    writeCsvFile(filename, csvLines);
})();
