#!/usr/bin/env node

import { Command } from "commander";
import dotenv from "dotenv";
import { BulksenderCommand } from "./commands/bulksender/bulksender.js";
import { EmptyWalletCommand } from "./commands/empty-wallet.js";
import { faucet } from "./commands/faucet.js";
import { FindCoinHoldersCommand } from "./commands/find-coin-holders.js";
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
    .version("0.0.1");

program.configureHelp({
    sortSubcommands: true,
    subcommandTerm: (cmd) => cmd.name(), // only show the name, instead of short usage.
});

program
    .command("faucet")
    .description("Get SUI from the faucet on localnet/devnet/testnet")
    .option("-a, --address <addresses...>", "One or more Sui addresses where SUI should be sent")
    .action(async (options) => {
        await faucet(options.address || []);
    });

program
    .command("empty-wallet")
    .description("Send all objects in your wallet to a random address (except Coin<SUI>)")
    .option("-r, --recipient <recipient>", "The address where the objects will be sent")
    .action((options) => {
        const command = new EmptyWalletCommand();
        command.execute([options.recipient]);
    });

program
    .command("bulksender")
    .description("Send Coin<T> to a list of addresses")
    .option("-c, --coin-id <coinId>", "The Coin<T> to pay for the airdrop")
    .option("-i, --input-file <inputFile>", "Path to a CSV with recipient addresses and amounts")
    .option("-o, --output-file <outputFile>", "Path to a text file to log transaction details")
    .action((options) => {
        const command = new BulksenderCommand();
        command.execute([options.coinId, options.inputFile, options.outputFile]);
    });

program
    .command("find-coin-holders")
    .description("Find Coin<T> holders using the Suiscan API")
    .option("-c, --coin-type <coinType>", "The type of the coin (the T in Coin<T>)")
    .option("-o, --output-file <outputFile>", "JSON file with addresses and (inaccurate) balances")
    .action((options) => {
        const command = new FindCoinHoldersCommand();
        command.execute([options.coinType, options.outputFile]);
    });

program
    .command("find-last-txn")
    .description("Find the last transaction for each Sui address")
    .option("-i, --input-file <inputFile>", "JSON file with addresses and balances")
    .option("-o, --output-file <outputFile>", "JSON file with addresses and their last transaction ID and time")
    .action((options) => {
        const command = new FindLastTransactionCommand();
        command.execute([options.inputFile, options.outputFile]);
    });

program
    .command("find-nft-holders")
    .description("Find NFT holders for a set of collections via Indexer.xyz")
    .option("-i, --input-file <inputFile>", "JSON file with collection names and Indexer.xyz collection IDs")
    .option("-d, --output-dir <outputDir>", "Output directory to write the TXT files")
    .action((options) => {
        const command = new FindNftHoldersCommand();
        command.execute([options.inputFile, options.outputDir]);
    });

program
    .command("find-nfts")
    .description("Find all NFTs and their owners for a set of collections via Indexer.xyz")
    .option("-i, --input-file <inputFile>", "JSON file with collection names and Indexer.xyz collection IDs")
    .option("-d, --output-dir <outputDir>", "Output directory to write the JSON files")
    .action((options) => {
        const command = new FindNftsCommand();
        command.execute([options.inputFile, options.outputDir]);
    });

program
    .command("generate-addresses-and-balances")
    .description("Generate random Sui addresses and balances (for testing)")
    .option("-a, --amount <amount>", "The amount of address-balance pairs to generate")
    .action((options) => {
        const command = new GenerateAddressesAndBalancesCommand();
        command.execute([options.amount]);
    });

program
    .command("get-balance")
    .description("Get the total Coin<T> balance owned by one or more addresses.")
    .option("-c, --coin-type <coinType>", "The type of the coin (the T in Coin<T>)")
    .option("-a, --addresses <addresses...>", "The Sui address or addresses to query the balance for")
    .action((options) => {
        const command = new GetBalanceCommand();
        command.execute([options.coinType, ...options.addresses]);
    });

program
    .command("send-coin")
    .description("Send an amount of Coin<T> to a recipient (handles coin merging and splitting)")
    .option("-a, --amount <amount>", "The amount to send, without decimals")
    .option("-c, --coin-type <coinType>", "The type of the coin (the T in Coin<T>)")
    .option("-r, --recipient <recipient>", "The address of the recipient")
    .action((options) => {
        const command = new SendCoinAmountCommand();
        command.execute([options.amount, options.coinType, options.recipient]);
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
    .action((options) => {
        const command = new TransformBalancesJsonToCsvCommand();
        command.execute([options.decimals, options.inputFile, options.outputFile]);
    });

program.parse(process.argv);
