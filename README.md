# Polymedia Commando

Sui command line tools to help with Sui airdrops (send coins to many addresses), gather data from different sources (Sui RPCs, Indexer.xyz, Suiscan), and more.

![Polymedia Commando](https://assets.polymedia.app/img/commando/open-graph.webp)

## Installation

Clone the repo:

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
