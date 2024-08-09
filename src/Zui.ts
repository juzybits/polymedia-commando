#!/usr/bin/env node

import { Command } from "commander";
import dotenv from "dotenv";
import { bulksend } from "./commands/bulksender/bulksender.js";
import { emptyWallet } from "./commands/empty-wallet.js";
import { faucet } from "./commands/faucet.js";
import { findCoinHolders } from "./commands/find-coin-holders.js";
import { FindLastTransactionCommand } from "./commands/find-last-txn.js";
import { FindNftHoldersCommand } from "./commands/find-nft-holders.js";
import { FindNftsCommand } from "./commands/find-nfts.js";
import { GenerateAddressesAndBalancesCommand } from "./commands/generate-addresses-and-balances.js";
import { GetBalanceCommand } from "./commands/get-balance.js";
import { SendCoinAmountCommand } from "./commands/send-coin-amount.js";
import { TestRpcEndpointsCommand } from "./commands/test-rpc-endpoints.js";
import { TransformBalancesJsonToCsvCommand } from "./commands/transform-balances-json-to-csv.js";

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
    .command("bulksend")
    .description("Send Coin<T> to a list of addresses")
    .requiredOption("-c, --coin-id <coinId>", "The Coin<T> to pay for the airdrop")
    .requiredOption("-i, --input-file <inputFile>", "Path to a CSV with recipient addresses and amounts")
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
    .option("-a, --address <addresses...>", "One or more Sui addresses where SUI should be sent")
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
    .command("find-last-txn")
    .description("Find the last transaction for each Sui address")
    .option("-i, --input-file <inputFile>", "JSON file with addresses and balances")
    .option("-o, --output-file <outputFile>", "JSON file with addresses and their last transaction ID and time")
    .action((opts) => {
        const command = new FindLastTransactionCommand();
        command.execute([opts.inputFile, opts.outputFile]);
    });

program
    .command("find-nft-holders")
    .description("Find NFT holders for a set of collections via Indexer.xyz")
    .option("-i, --input-file <inputFile>", "JSON file with collection names and Indexer.xyz collection IDs")
    .option("-d, --output-dir <outputDir>", "Output directory to write the TXT files")
    .action((opts) => {
        const command = new FindNftHoldersCommand();
        command.execute([opts.inputFile, opts.outputDir]);
    });

program
    .command("find-nfts")
    .description("Find all NFTs and their owners for a set of collections via Indexer.xyz")
    .option("-i, --input-file <inputFile>", "JSON file with collection names and Indexer.xyz collection IDs")
    .option("-d, --output-dir <outputDir>", "Output directory to write the JSON files")
    .action((opts) => {
        const command = new FindNftsCommand();
        command.execute([opts.inputFile, opts.outputDir]);
    });

program
    .command("generate-addresses-and-balances")
    .description("Generate random Sui addresses and balances (for testing)")
    .option("-a, --amount <amount>", "The amount of address-balance pairs to generate")
    .action((opts) => {
        const command = new GenerateAddressesAndBalancesCommand();
        command.execute([opts.amount]);
    });

program
    .command("get-balance")
    .description("Get the total Coin<T> balance owned by one or more addresses.")
    .option("-c, --coin-type <coinType>", "The type of the coin (the T in Coin<T>)")
    .option("-a, --addresses <addresses...>", "The Sui address or addresses to query the balance for")
    .action((opts) => {
        const command = new GetBalanceCommand();
        command.execute([opts.coinType, ...opts.addresses]);
    });

program
    .command("send-coin")
    .description("Send an amount of Coin<T> to a recipient (handles coin merging and splitting)")
    .option("-a, --amount <amount>", "The amount to send, without decimals")
    .option("-c, --coin-type <coinType>", "The type of the coin (the T in Coin<T>)")
    .option("-r, --recipient <recipient>", "The address of the recipient")
    .action((opts) => {
        const command = new SendCoinAmountCommand();
        command.execute([opts.amount, opts.coinType, opts.recipient]);
    });

program
    .command("test-rpc-endpoints")
    .description("Test the latency of various Sui RPC endpoints")
    .action(() => {
        const command = new TestRpcEndpointsCommand();
        command.execute();
    });

program
    .command("transform-balances-json-to-csv")
    .description("Transform a .json file containing addresses and balances into a .csv file")
    .option("-d, --decimals <decimals>", "Number of decimals for Coin<T>")
    .option("-i, --input-file <inputFile>", "JSON file with addresses and balances (with decimals)")
    .option("-o, --output-file <outputFile>", "CSV file with addresses and balances (without decimals)")
    .action((opts) => {
        const command = new TransformBalancesJsonToCsvCommand();
        command.execute([opts.decimals, opts.inputFile, opts.outputFile]);
    });

program.parse(process.argv);
