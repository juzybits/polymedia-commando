#!/usr/bin/env node

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { Command, Option } from "commander";
import dotenv from "dotenv";

import { bulksend } from "./commands/bulksend.js";
import { bytecodePublish } from "./commands/bytecode-publish.js";
import { bytecodeTransform } from "./commands/bytecode-transform.js";
import { coinSend } from "./commands/coin-send.js";
import { coinZeroDestroy } from "./commands/coin-zero-destroy.js";
import { coinSendZero } from "./commands/coin-zero-send.js";
import { emptyWallet } from "./commands/empty-wallet.js";
import { findCoinHolders } from "./commands/find-coin-holders.js";
import { findLastTx } from "./commands/find-last-tx.js";
import { findNftHolders } from "./commands/find-nft-holders.js";
import { findNftVerified } from "./commands/find-nft-verified.js";
import { findNfts } from "./commands/find-nfts.js";
import { msgSign } from "./commands/msg-sign.js";
import { msgVerify } from "./commands/msg-verify.js";
import { randAddr } from "./commands/rand-addr.js";
import "./types.js";

// @ts-expect-error Property 'toJSON' does not exist on type 'BigInt'
BigInt.prototype.toJSON = function() { return this.toString(); };

dotenv.config();

const program = new Command();

program
    .name("zui")
    .description("ZUI: Sui command line tools")
    .version(`zui ${getVersion()}`)
    .option("--json", "output in JSON format (useful for scripting)")
    .option("-q, --quiet", "suppress non-error output")
    .option("-v, --verbose", "show debug output")
    .hook("preAction", (thisCommand) => {
        global.outputJson = thisCommand.opts().json ?? false;
        global.outputQuiet = thisCommand.opts().quiet ?? false;
        global.outputVerbose = thisCommand.opts().verbose ?? false;
    });

program.configureHelp({
    sortSubcommands: true,
    subcommandTerm: (cmd) => cmd.name(), // only show the name, instead of short usage.
});

program
    .command("bulksend")
    .description("Send Coin<T> to a list of addresses")
    .requiredOption("-c, --coin-type <coinType>", "The type of coin to send (the T in Coin<T>)")
    .requiredOption("-i, --input-file <inputFile>", "Path to a CSV with recipient addresses and coin amounts")
    .action(async (opts) => {
        await bulksend(opts.coinType, opts.inputFile);
    });

program
    .command("bytecode-publish")
    .description("Publish Move bytecode files as a Sui package")
    .requiredOption("-f, --files <files...>", "One or more Move bytecode files to publish")
    .option("-d, --dependencies <dependencies...>", "The package IDs of dependencies, if any (0x1 and 0x2 are always included)")
    .action(async (opts) => {
        await bytecodePublish({
            bytecodeFiles: opts.files,
            dependencies: opts.dependencies,
        });
    });

program
    .command("bytecode-transform")
    .description("Replace constants and identifiers in Move bytecode files")
    .addHelpText("after", `
Example config file:
{
    "outputDir": "path/to/output/directory",
    "identifiers": {
        "nft": "my_nft", // module/function/field
        "NFT": "MY_NFT", // one-time witness
        "Nft": "MyNft"   // struct
    },
    "files": [
        {
            "bytecodeInputFile": "your-package/build/Example/bytecode_modules/nft.mv",
            "constants": []
        },
        {
            "bytecodeInputFile": "your-package/build/Example/bytecode_modules/collection.mv",
            "constants": [
                { // nft supply
                    "moveType": "u64",
                    "oldVal": 1000,
                    "newVal": 9000
                },
                { // collection name
                    "moveType": "vector<u8>",
                    "oldVal": "old string",
                    "newVal": "new string"
                },
                { // array of addresses
                    "moveType": "vector<address>",
                    "oldVal": [ "0x111", "0x222" ],
                    "newVal": [ "0x999", "0x888" ]
                }
            ]
        }
    ]
}

For a complete working example, visit https://github.com/juzybits/polymedia-commando/blob/main/src/sui-bytecode`)
    .requiredOption("-c, --config <file>", "Path to a JSON file specifying transformations")
    .option("-b, --build [directory]", "Build the Move package in this directory before transforming")
    .action(async (opts) => {
        await bytecodeTransform({
            configFile: opts.config,
            buildDir: opts.build,
        });
    });

program
    .command("coin-send")
    .description("Send a Coin<T> amount to a recipient")
    .requiredOption("-a, --amount <amount>", "The number of coins to send (e.g. 0.5 for 0.5 SUI)")
    .requiredOption("-c, --coin-type <coinType>", "The type of the coin (the T in Coin<T>)")
    .requiredOption("-r, --recipient <recipient>", "The address of the recipient")
    .action(async (opts) => {
        await coinSend({
            amount: opts.amount,
            coinType: opts.coinType,
            recipient: opts.recipient,
        });
    });

program
    .command("coin-zero-destroy")
    .description("Destroy all Coin<T> objects with 0 balance in your wallet")
    .action(async (_opts) => {
        await coinZeroDestroy();
    });

program
    .command("coin-zero-send")
    .description("Create and send coins with 0 balance")
    .requiredOption("-n, --number <number>", "The number of coins to send")
    .requiredOption("-c, --coin-type <coinType>", "The type of the coin (the T in Coin<T>)")
    .requiredOption("-r, --recipient <recipient>", "The address of the recipient")
    .action(async (opts) => {
        await coinSendZero({
            number: opts.number,
            coinType: opts.coinType,
            recipient: opts.recipient,
        });
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
    .requiredOption("-c, --coin-type <string>", "The type of the coin (the T in Coin<T>)")
    .option("-l, --limit [number]", "Get at most this many holders")
    .action(async (opts) => {
        await findCoinHolders({
            coinType: opts.coinType,
            limit: opts.limit,
        });
    });

program
    .command("find-last-tx")
    .description("Find the latest transaction for one or more Sui addresses")
    .addOption(new Option("-a, --address [address...]", "One or more Sui addresses")
        .conflicts("input-file"))
    .addOption(new Option("-i, --input-file [path]", "A plain text file with one address per line, or a CSV/TSV file with the addresses in the first column, or a JSON file with an array of addresses")
        .conflicts("address"))
    .action(async (opts) => {
        await findLastTx({
            addresses: opts.address,
            inputFile: opts.inputFile,
        });
    });

program
    .command("find-nft-holders")
    .description("Find NFT holders for a set of collections via Indexer.xyz")
    .requiredOption("-t, --type [type]", "The NFT type to find holders for (e.g. `0x123::nft::SomeNft`).")
    .action(async (opts) => {
        await findNftHolders({
            type: opts.type,
        });
    });

program
    .command("find-nfts")
    .description("Find all NFTs and their owners for a set of collections via Indexer.xyz")
    .requiredOption("-t, --type [type]", "The NFT type to find holders for (e.g. `0x123::nft::SomeNft`).")
    .action(async (opts) => {
        await findNfts({
            type: opts.type,
        });
    });

program
    .command("find-nft-verified")
    .description("Find all verified NFT collections via Indexer.xyz")
    .requiredOption("-o, --output-file <outputFile>", "Output file to write the JSON")
    .action(async (opts) => {
        await findNftVerified(opts.outputFile);
    });

program
    .command("msg-sign")
    .description("Sign a Sui personal message")
    .addHelpText("after", `
Output:
  On success (exit code 0):
      {"signature": "..."}

  On failure (exit code 1)
      {"signature": null, "error": "The error message"}

Example:
  zui msg-sign "Hello Sui"
`)
    .requiredOption("-m, --message <string>", "message to sign")
    .action(async (opts) => {
        await msgSign(opts.message);
    });

program
    .command("msg-verify")
    .description("Verify a Sui personal message signature")
    .addHelpText("after", `
Output:
  On success (exit code 0):
      {"success": true}

  On failure (exit code 1):
      {"success": false, "error": "The error message"}

Example:
  zui msg-verify \\
      -m "Hello Sui" \\
      -a "0x9859bde15e867d37256aa080b5d092a2ed09347601ebc751c4478cf26f882bea" \\
      -s "ACUqih6ukoYyYmAqJ3mE9Yy0XxvnvOQuTKUumE1mOwfAcMIJWpsIcoU/1Jaij2ywjbMvik+NWUeRBPvg2HHYGQs7AdEIr//TRcmBsxmWwuzr9KVoj/MN1Vw+eHF1eqmckg=="`)
    .requiredOption("-m, --message <string>", "message that was signed")
    .requiredOption("-a, --address <string>", "signer address")
    .requiredOption("-s, --signature <string>", "signature to verify")
    .action(async (opts) => {
        await msgVerify({
            message: opts.message,
            address: opts.address,
            signature: opts.signature,
        });
    });

program
    .command("rand-addr")
    .description("Generate pseudorandom Sui addresses")
    .requiredOption("-n, --number <number>", "The amount of addresses to generate")
    .option("-b, --balance", "Include a random balance with each address")
    .action(async (opts) => {
        await randAddr(opts.number, opts.balance);
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
