#!/usr/bin/env node

import { Command } from "commander";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { balance } from "./commands/balance.js";
import { bulksend } from "./commands/bulksender/bulksend.js";
import { destroyZero } from "./commands/destroy-zero.js";
import { emptyWallet } from "./commands/empty-wallet.js";
import { findCoinHolders } from "./commands/find-coin-holders.js";
import { findLastTx } from "./commands/find-last-tx.js";
import { findNftHolders } from "./commands/find-nft-holders.js";
import { findNftVerified } from "./commands/find-nft-verified.js";
import { findNfts } from "./commands/find-nfts.js";
import { randomAddr } from "./commands/random-addr.js";
import { sendCoin } from "./commands/send-coin.js";
import { testRpcs } from "./commands/test-rpcs.js";

dotenv.config();

const program = new Command();

// TODO: add msg-verify
// TODO: add msg-sign

program
    .name("zui")
    .description("POLYMEDIA ZUI: Sui command line tools")
    .version(`zui ${getVersion()}`);

program.configureHelp({
    sortSubcommands: true,
    subcommandTerm: (cmd) => cmd.name(), // only show the name, instead of short usage.
});

program
    .command("balance")
    .description("Get the total Coin<T> balance owned by one or more addresses")
    .requiredOption("-c, --coin-type <coinType>", "The type of the coin (the T in Coin<T>)")
    .requiredOption("-a, --addresses <addresses...>", "The address(es) to query the balance for")
    .action(async (opts) => {
        await balance(opts.coinType, opts.addresses);
    });

program
    .command("bulksend")
    .description("Send Coin<T> to a list of addresses")
    .requiredOption("-c, --coin-id <coinId>", "The Coin<T> to pay for the airdrop")
    .requiredOption("-i, --input-file <inputFile>", "Path to a CSV with recipient addresses and coin amounts")
    .requiredOption("-o, --output-file <outputFile>", "Path to a text file to log transaction details")
    .action(async (opts) => {
        await bulksend(opts.coinId, opts.inputFile, opts.outputFile);
    });

program
    .command("destroy-zero")
    .description("Destroy all Coin<T> objects with 0 balance in your wallet")
    .option("-d, --dev-inspect", "Don't execute the transaction, just use devInspectTransactionBlock()", false)
    .action(async (opts) => {
        await destroyZero(opts.devInspect);
    });

program
    .command("empty-wallet")
    .description("Send all objects in your wallet to a random address (except Coin<SUI>)")
    .option("-r, --recipient <recipient>", "The address where the objects will be sent")
    .action(async (opts) => {
        await emptyWallet(opts.recipient);
    });

program
    .command("find-coin-holders")
    .description("Find Coin<T> holders using the Suiscan API")
    .requiredOption("-c, --coin-type <coinType>", "The type of the coin (the T in Coin<T>)")
    .requiredOption("-o, --output-file <outputFile>", "JSON file with addresses and balances")
    .option("-l, --limit <limit>", "Get at most this many holders")
    .action(async (opts) => {
        await findCoinHolders(opts.coinType, opts.outputFile, opts.limit);
    });

program
    .command("find-last-tx")
    .description("Find the last transaction for each Sui address")
    .requiredOption("-i, --input-file <inputFile>", "JSON file with an array of addresses")
    .requiredOption("-o, --output-file <outputFile>", "JSON file with addresses and their last transaction ID and time")
    .action(async (opts) => {
        await findLastTx(opts.inputFile, opts.outputFile);
    });

program
    .command("find-nft-holders")
    .summary("Find NFT holders for a set of collections via Indexer.xyz")
    .description(
`Find NFT holders for a set of collections via Indexer.xyz

Example input file:
[
    { "name": "Prime Machin", "indexerId": "07231735-96de-4710-8e11-52c61a482578" },
    { "name": "Fuddies", "indexerId": "4827d37b-5574-404f-b030-d26912ad7461" }
]`
    )
    .requiredOption("-i, --input-file <inputFile>", "JSON file with collection names and Indexer.xyz collection IDs")
    .requiredOption("-o, --output-dir <outputDir>", "Output directory to write the TXT files")
    .action(async (opts) => {
        await findNftHolders(opts.inputFile, opts.outputDir);
    });

program
    .command("find-nfts")
    .summary("Find all NFTs and their owners for a set of collections via Indexer.xyz")
    .description(
`Find all NFTs and their owners for a set of collections via Indexer.xyz

Example input file:
[
    { "name": "Prime Machin", "indexerId": "07231735-96de-4710-8e11-52c61a482578" },
    { "name": "Fuddies", "indexerId": "4827d37b-5574-404f-b030-d26912ad7461" }
]`
    )
    .requiredOption("-i, --input-file <inputFile>", "JSON file with collection names and Indexer.xyz collection IDs")
    .requiredOption("-o, --output-dir <outputDir>", "Output directory to write the JSON files")
    .action(async (opts) => {
        await findNfts(opts.inputFile, opts.outputDir);
    });

program
    .command("find-nft-verified")
    .description("Find all verified NFT collections via Indexer.xyz")
    .requiredOption("-o, --output-file <outputFile>", "Output file to write the JSON")
    .action(async (opts) => {
        await findNftVerified(opts.outputFile);
    });

program
    .command("random-addr")
    .description("Generate pseudorandom Sui addresses")
    .requiredOption("-n, --number <number>", "The amount of addresses to generate")
    .option("-b, --balance", "Include a random balance with each address")
    .action(async (opts) => {
        await randomAddr(opts.number, opts.balance);
    });

program
    .command("send-coin")
    .description("Send a Coin<T> amount to a recipient")
    .requiredOption("-n, --number <number>", "The number of coins to send (e.g. 0.5 for 0.5 SUI)")
    .requiredOption("-c, --coin-type <coinType>", "The type of the coin (the T in Coin<T>)")
    .requiredOption("-r, --recipient <recipient>", "The address of the recipient")
    .action(async (opts) => {
        await sendCoin(opts.number, opts.coinType, opts.recipient);
    });

program
    .command("test-rpcs")
    .description("Measure the latency of various Sui RPC endpoints")
    .action(async () => {
        await testRpcs();
    });

program.parse(process.argv);

function getVersion(): string
{
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const packageText = readFileSync(join(__dirname, "..", "package.json"), "utf8");
    const packageJson = JSON.parse(packageText);
    return packageJson.version;
}
