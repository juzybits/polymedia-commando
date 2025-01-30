# Polymedia Commando (Sui command line tools)

Sui command line tools to help with Sui airdrops (send coins to many addresses), gather data from different sources (Sui RPCs, Indexer.xyz, Suiscan), and more.

![Polymedia Commando](https://assets.polymedia.app/img/commando/open-graph.webp)

## Installation method 1: install globally

```
npm install -g @polymedia/zui
zui -h
```

## Installation method 2: clone the repo

```
git clone https://github.com/juzybits/polymedia-commando.git
cd polymedia-commando
pnpm install
pnpm zui -h
```

If you'll fetch NFT data, set your Indexer.xyz credentials as environment variables:
```
export INDEXER_API_USER=your_username
export INDEXER_API_KEY=your_api_key
```

## Usage

Tools can be used as follows:

```
zui COMMAND [OPTIONS]
```

See all available tools with `zui -h`:

```
ZUI: Sui command line tools

Options:
  -V, --version      output the version number
  -h, --help         display help for command

Commands:
  bulksend           Send Coin<T> to a list of addresses
  destroy-zero       Destroy all Coin<T> objects with 0 balance in your wallet
  empty-wallet       Send all objects in your wallet to a random address (except Coin<SUI>)
  find-coin-holders  Find Coin<T> holders using the Suiscan API
  find-last-tx       Find the last transaction for each Sui address
  find-nft-holders   Find NFT holders for a set of collections via Indexer.xyz
  find-nft-verified  Find all verified NFT collections via Indexer.xyz
  find-nfts          Find all NFTs and their owners for a set of collections via Indexer.xyz
  help               display help for command
  msg-verify         Verify a Sui personal message signature
  random-addr        Generate pseudorandom Sui addresses
  send-coin          Send a Coin<T> amount to a recipient
```
