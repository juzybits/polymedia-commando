# Holder Finder

Tools to find holders of Sui NFT collections, using the indexer.xyz API.

## Usage

### Setup

```
# Add your API credentials:
cp src/.auth.example.ts src/.auth.ts

# Define the NFT collections you want:
src/config.ts
```

### Fetch all NFTs

Retrieves all NFTs and their owners. It outputs one file per collection into `./data/{collection}.nfts.json`.
```
pnpm fetchNfts
```

### Aggregate NFTs by owner

Aggregates the .json files produced by fetchNfts. It outputs one .csv file which includes all holders and collections: `all.aggregate.csv`, showing how many NFTs each holder owns for each collection, and how many coins they are entitled to according to the allocations defined in config.ts.
```
pnpm aggregateNfts
```

### Fetch all owners

If you only need the holder addresses (and not how many NFTs they own), you can retrieve them with this command. It outputs one file per collection into `./data/{collection}.holders.txt`.
```
pnpm fetchHolders
```
