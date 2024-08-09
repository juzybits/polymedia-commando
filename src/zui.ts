#!/usr/bin/env node

import { Command } from "commander";
import dotenv from "dotenv";
import { balance } from "./commands/balance.js";
import { bulksend } from "./commands/bulksender/bulksender.js";
import { emptyWallet } from "./commands/empty-wallet.js";
import { faucet } from "./commands/faucet.js";
import { findCoinHolders } from "./commands/find-coin-holders.js";
import { findLastTx } from "./commands/find-last-tx.js";
import { findNftHolders } from "./commands/find-nft-holders.js";
import { findNfts } from "./commands/find-nfts.js";
import { randomAddresses } from "./commands/random-addresses.js";
import { sendCoin } from "./commands/send-coin.js";
import { testRpcs } from "./commands/test-rpcs.js";

dotenv.config();

const program = new Command();

program
    .name("zui")
    .description("POLYMEDIA ZUI: Sui command line tools")
    .version("0.0.2");

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
    .command("empty-wallet")
    .description("Send all objects in your wallet to a random address (except Coin<SUI>)")
    .option("-r, --recipient <recipient>", "The address where the objects will be sent")
    .action(async (opts) => {
        await emptyWallet(opts.recipient);
    });

program
    .command("faucet")
    .description("Get SUI from the faucet on localnet/devnet/testnet")
    .option("-a, --address <addresses...>", "Address(es) where SUI should be sent. Defaults to your active address.")
    .action(async (opts) => {
        await faucet(opts.address || []);
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
    .description("Find NFT holders for a set of collections via Indexer.xyz")
    .requiredOption("-i, --input-file <inputFile>", "JSON file with collection names and Indexer.xyz collection IDs")
    .requiredOption("-o, --output-dir <outputDir>", "Output directory to write the TXT files")
    .action(async (opts) => {
        await findNftHolders(opts.inputFile, opts.outputDir);
    });

program
    .command("find-nfts")
    .description("Find all NFTs and their owners for a set of collections via Indexer.xyz")
    .requiredOption("-i, --input-file <inputFile>", "JSON file with collection names and Indexer.xyz collection IDs")
    .requiredOption("-o, --output-dir <outputDir>", "Output directory to write the JSON files")
    .action(async (opts) => {
        await findNfts(opts.inputFile, opts.outputDir);
    });

program
    .command("random-addresses")
    .description("Generate pseudorandom Sui addresses")
    .requiredOption("-n, --number <number>", "The amount of addresses to generate")
    .option("-b, --balance", "Include a random balance with each address")
    .action(async (opts) => {
        await randomAddresses(opts.number, opts.balance);
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
