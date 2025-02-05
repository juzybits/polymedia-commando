# zui: Sui command line tools

![polymedia zui](https://assets.polymedia.app/img/commando/open-graph.webp)

## `zui -h`

```
Usage: zui [options] [command]

zui: Sui command line tools

Options:
  -V, --version       output the version number
  --json              output in JSON format
  -q, --quiet         suppress non-error output
  -v, --verbose       show debug output
  -h, --help          display help for command

Commands:
  bulksend            Send Coin<T> to a list of addresses
  bytecode-transform  Replace constants and identifiers in Move bytecode files
  bytecode-publish    Publish Move bytecode files as a Sui package
  coin-send           Send a Coin<T> amount to a recipient
  coin-zero-destroy   Destroy all Coin<T> objects with 0 balance in your wallet
  coin-zero-send      Create and send coins with 0 balance
  empty-wallet        Send all objects in your wallet to a random address (except Coin<SUI>)
  find-coin-holders   Find Coin<T> holders using the Suiscan API
  find-last-tx        Find the latest transaction for one or more Sui addresses
  find-nft-holders    Find NFT holders for a set of collections via Indexer.xyz
  find-nfts           Find all NFTs and their owners for a set of collections via Indexer.xyz
  find-nft-verified   Find all verified NFT collections via Indexer.xyz
  msg-sign            Sign a Sui personal message with your active keypair
  msg-verify          Verify a Sui personal message signature
  rand-addr           Generate pseudorandom Sui addresses
  help                display help for command
```

## Installation

```
npm --global install @polymedia/zui
zui -h
```

If you'll fetch NFT data, set your Indexer.xyz credentials as environment variables:
```
export INDEXER_API_USER=your_username
export INDEXER_API_KEY=your_api_key
```


## Development

```
git clone https://github.com/juzybits/polymedia-commando.git
cd polymedia-commando
cd src/cli
pnpm i
pnpm zui -h
```
