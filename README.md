# Polymedia Commando (`zui`)

Sui command line tools to help with Sui airdrops (send coins to many addresses), gather data from different sources (Sui RPCs, Indexer.xyz, Suiscan), and more.

![Polymedia Commando](https://assets.polymedia.app/img/commando/open-graph.webp)

## Installation method 1: install globally

```
npm install -g @polymedia/commando
zui -h
```

## Installation method 2: clone the repo

```
git clone https://github.com/juzybits/polymedia-commando.git
cd polymedia-commando
pnpm install
pnpm zui -h
```

Create `.env` and add your Indexer.xyz credentials if you'll fetch NFT data:

```
cp .env.example .env
```

## Usage

Tools can be used as follows:

```
zui COMMAND [OPTIONS]
```

See all available tools with `zui -h`:

```
POLYMEDIA COMMANDO

Usage:
  zui COMMAND [OPTIONS]

Available Commands:
  - bulksender: Send Coin<T> to a list of addresses
  - empty-wallet: Send all objects in your wallet to a random address (except Coin<SUI>)
  - find-coin-balances: Find how much Coin<T> is owned by each address
  - find-coin-holders: Find Coin<T> holders using the Suiscan API
  - find-last-txn: Find the last transaction for each Sui address
  - find-nft-holders: Find NFT holders for a set of collections via Indexer.xyz
  - find-nfts: Find all NFTs and their owners for a set of collections via Indexer.xyz
  - get-balance: Get the total Coin<T> balance owned by one or more addresses.
  - request-sui-from-faucet: Get SUI from the faucet on localnet/devnet/testnet
  - send-coin-amount: Send an amount of Coin<T> to a recipient (handles coin merging and splitting)
  - test-rpc-endpoints: Test the latency of various Sui RPC endpoints
  ...

For more information about a command:
  zui COMMAND -h
```
