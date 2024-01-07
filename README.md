# Polymedia Commando

Sui command line tools and TypeScript utilities for airdrops, data gathering, and more.

![Polymedia Commando](https://assets.polymedia.app/img/commando/open-graph.webp)

## Command line tools

Tools to help with Sui airdrops (send coins to many addresses) and to gather data from different sources (Sui RPCs, Indexer.xyz, Suiscan).

### How to use
```
# 1) Clone the repo
git clone https://github.com/juzybits/polymedia-commando.git
cd polymedia-commando
pnpm install

# 2) Create .auth.js (add your Indexer.xyz credentials if you'll fetch NFT data)
cp src/.auth.example.ts src/.auth.ts

# 3) Use the tools
pnpm commando COMMAND [OPTIONS]
```

See all available tools with `pnpm commando -h`:

```
POLYMEDIA COMMANDO

Usage:
  pnpm commando COMMAND [OPTIONS]

Available Commands:
  - bulksender: Send Coin<T> to a list of addresses
  - find_coin_balances: Find how much Coin<T> is owned by each address
  - find_coin_holders: Find Coin<T> holders using the Suiscan API
  - find_last_txn: Find the last transaction for each Sui address
  - find_nft_holders: Find the list of unique NFT holders for a set of collections
  - find_nfts: Find all NFTs and their owners for a set of collections
  ...

For more information about a command:
  pnpm commando COMMAND -h
```

## TypeScript utilities

Functions and classes that you can use in your Node.js projects.

### How to use

```
# 1) Install the Polymedia Commando NPM package:
pnpm install @polymedia/commando

# 2) Use it in your code, for example:
import { getActiveEnv } from '@polymedia/commando';
```

### Sui utils
- `function generateRandomAddress` - Generate a random Sui address.
- `function getActiveAddressKeypair` - Build a `Ed25519Keypair` object for the current active address by loading the secret key from `~/.sui/sui_config/sui.keystore`.
- `function getActiveEnv` - Get the active Sui environment from `sui client active-env`.
- `function validateAndNormalizeSuiAddress` - Validate a Sui address and return its normalized form, or `null` if invalid.
- `function MultiSuiClient.executeInBatches` - Execute many `SuiClient` RPC operations in parallel using multiple endpoints.

### File utils
- `function fileExists` - Check if a file exists in the filesystem.
- `function readCsvFile` - Read a CSV file and parse each line into an object.
- `function readJsonFile` - Read a JSON file and parse its contents into an object.
- `function writeCsvFile` - Write objects into a CSV file.
- `function writeJsonFile` - Write an object's JSON representation into a file.
- `function writeTextFile` - Write a string into a file.

### Misc utils
- `function apiRequestIndexer` - Make a request to the Indexer.xyz API (NFTs).
- `function chunkArray` - Split an array into multiple chunks of a certain size.
- `function formatNumber` - Format a number into a readable string.
- `function promptUser` - Display a query to the user and wait for their input. Return true if the user enters `y`.
- `function sleep` - Wait for a number of milliseconds.
