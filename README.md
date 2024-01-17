# Polymedia Commando

Sui command line tools to help with Sui airdrops (send coins to many addresses), gather data from different sources (Sui RPCs, Indexer.xyz, Suiscan), and more.

![Polymedia Commando](https://assets.polymedia.app/img/commando/open-graph.webp)

## Installation

Clone and install the repo:

```
git clone https://github.com/juzybits/polymedia-commando.git
cd polymedia-commando
pnpm install
```

Create `.auth.js` (add your Indexer.xyz credentials if you'll fetch NFT data):

```
cp src/.auth.example.ts src/.auth.ts
```

## Usage

Tools can be used as follows:

```
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
  - find_nft_holders: Find NFT holders for a set of collections via Indexer.xyz
  - find_nfts: Find all NFTs and their owners for a set of collections via Indexer.xyz
  - test_rpc_endpoints: Test the latency of various Sui RPC endpoints
  ...

For more information about a command:
  pnpm commando COMMAND -h
```

## TypeScript utilities

In addition to the command line tools, the `@polymedia/commando` NPM package
provides some utility functions for Node.js projects.

### Usage

```
# 1) Add the package to your project:
pnpm add @polymedia/commando

# 2) Use it in your code:
import { readCsvFile } from '@polymedia/commando';
```

### Functions
- `promptUser` - Display a query to the user and wait for their input. Return true if the user enters `y`.
- `fileExists` - Check if a file exists in the filesystem.
- `readCsvFile` - Read a CSV file and parse each line into an object.
- `readJsonFile` - Read a JSON file and parse its contents into an object.
- `writeCsvFile` - Write objects into a CSV file.
- `writeJsonFile` - Write an object's JSON representation into a file.
- `writeTextFile` - Write a string into a file.
