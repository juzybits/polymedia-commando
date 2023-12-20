export const outDir = './data';

/**
 * @property {string} name - The NFT collection name, used in the output CSV filenames and contents.
 * @property {string} indexerId - The collection ID in the indexer.xyz API, used to pull holder data.
 * @property {number} allocationPerNft - The amount of coins allocated to each NFT (without decimals).
 */
export const collections = [
    { name: "ahoy_pirates", indexerId: "91bebce3-5f48-4d06-a1a2-56d04af1c999", allocationPerNft: 100_000_000 },
    { name: "cosmocadia", indexerId: "9b2776c4-7e25-493a-a0bb-944ad4d23ad7", allocationPerNft: 200_000_000 },
    { name: "desuilabs", indexerId: "5830cc88-e420-43bb-a309-16b3ae2bf48d", allocationPerNft: 300_000_000 },
    { name: "dsl_legacy", indexerId: "307c7e7a-be3a-43a5-ae44-37f3a37d01f9", allocationPerNft: 400_000_000 },
    { name: "enforcer_machin", indexerId: "e5385a7a-075e-4382-96dd-1caaf960bd13", allocationPerNft: 500_000_000 },
    { name: "fuddies", indexerId: "4827d37b-5574-404f-b030-d26912ad7461", allocationPerNft: 600_000_000 },
    { name: "gommies", indexerId: "fbb4e6bc-7c71-42a6-80c2-196f876198e0", allocationPerNft: 700_000_000 },
    { name: "hypersuitest", indexerId: "41e85ea6-15e2-4e60-86f2-1ed6f8d7dbf8", allocationPerNft: 800_000_000 },
    { name: "misfits", indexerId: "04b736be-7737-4260-b987-592f6dec35ab", allocationPerNft: 900_000_000 },
    { name: "panzer_dogs", indexerId: "569b3ddd-9500-4b39-a4aa-d26e8d3fe52d", allocationPerNft: 1_000_000_000 },
    { name: "tails_by_typus", indexerId: "d5ea5c61-5a91-40f2-9837-a1912a2083a1", allocationPerNft: 1_100_000_000 },
];
