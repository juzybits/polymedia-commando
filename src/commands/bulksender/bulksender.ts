import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { appendFileSync } from 'fs';
import { fileExists, readCsvFile } from '../../utils/file_utils.js';
import { chunkArray, formatNumber, promptUser, sleep } from '../../utils/misc_utils.js';
import { getActiveAddressKeypair, getActiveEnv, validateAndNormalizeSuiAddress } from '../../utils/sui_utils.js';
import { Command, NetworkName } from '../../types.js';

/**
 * The Polymedia Bulksender package ID which contains the bulksender::send() function
 */
const PACKAGE_IDS: Map<NetworkName, string> = new Map([
    ['localnet', ''],
    ['devnet', ''],
    ['testnet', '0x7f541b25c64aa2d0330a64dfaeb7c0e35924b6633069b8047125e038728d15d6'],
    ['mainnet', '0x026b2b422e630c79c961fdb5d63821547ec8fb2ad5b7095189c440e1bdbba9f1'],
]);
/**
 * How many addresses to include in each transaction block.
 * It breaks above 511 addresses per PTB. You'll get this error if BATCH_SIZE is too high:
 * "JsonRpcError: Error checking transaction input objects: SizeLimitExceeded"
 */
const BATCH_SIZE = 500;
/**
 * How long to sleep between RPC requests, in milliseconds.
 * The public RPC rate limit is 100 requests per 30 seconds according to
 * https://docs.sui.io/references/sui-api/rpc-best-practices
 */
const RATE_LIMIT_DELAY = 500;
/**
 * To estimate total gas costs
 */
const GAS_PER_ADDRESS = 0.0013092459;

export class BulksenderCommand extends Command {
    /**
     * The Coin<T> to pay for the airdrop. Must be owned by the current `sui client active-address`.
     */
    private coinId = '';
    /**
     * A list of airdrop recipients and amounts *WITHOUT DECIMALS*. For example, for a Coin<SUI> airdrop:
     *      0x123,25
     *      0x567,33
     * would airdrop 25_000_000_000 SUI to address 0x123 (5 * 10^9 MIST)
     */
    private inputFile = './data/bulksender.in.csv';
    /**
     * A log file with details about transactions sent/failed.
     */
    private outputFile = './data/bulksender.out';

    constructor(args: string[]) {
        super(args);
        this.coinId = args[0] || this.coinId
        this.inputFile = args[1] || this.inputFile;
        this.outputFile = args[2] || this.outputFile;
    }

    public getDescription(): string {
        return 'Send Coin<T> to a list of addresses';
    }

    public getUsage(): string {
        return `${this.getDescription()}

Usage: bulksender <COIN_ID> [INPUT_FILE] [OUTPUT_FILE]

Arguments:
  COIN_ID     - Required. The Coin<T> object to pay for the airdrop
  INPUT_FILE  - Optional. Path to the input file. Default is ${this.inputFile}
  OUTPUT_FILE - Optional. Path to the output file. Default is ${this.outputFile}

Example:
  bulksender 0x1234abdc ./custom/input.csv ./custom/output.csv
`;
    }

    public async execute(): Promise<void> {
        console.log(`Coin ID: ${this.coinId}`);
        console.log(`Input file: ${this.inputFile}`);
        console.log(`Output file: ${this.outputFile}`);

        try {
            // Abort if the output file already exists, to prevent double-runs
            if (fileExists(this.outputFile)) {
                throw new Error(`${this.outputFile} already exists. Check and handle it before rerunning the script.`);
            }

            // Abort if the input file doesn't exist
            if (!fileExists(this.inputFile)) {
                throw new Error(`${this.inputFile} doesn't exist. Create a .csv file with two columns: address and amount.`);
            }

            // Create a SuiClient instance for the current `sui client active-env`
            const networkName = getActiveEnv();
            console.log(`\nActive network: ${networkName}`);
            const suiClient = new SuiClient({ url: getFullnodeUrl(networkName)});

            // Get the keypair for the current `sui client active-address`
            const signer = getActiveAddressKeypair();
            const activeAddress = signer.toSuiAddress();
            console.log(`Active address: ${activeAddress}`)

            // Abort if COIN_ID doesn't exist
            console.log(`\nCOIN_ID: ${this.coinId}`);
            const coinObject = await suiClient.getObject({
                id: this.coinId,
                options: {
                    showContent: true,
                    showOwner: true,
                },
            });
            if (coinObject.error || coinObject.data?.content?.dataType !== 'moveObject') {
                throw new Error(`COIN_ID object doesn't exist on this network`);
            }

            // Abort if the user doesn't own COIN_ID
            if (activeAddress !== (coinObject.data as any).owner.AddressOwner) {
                throw new Error(`Your active address doesn't own COIN_ID`);
            }

            // Get COIN_ID type (the `T` in `Coin<T>`)
            const coinTypeFull = coinObject.data.content.type; // e.g. "0x2::coin::Coin<0x2::sui::SUI>"
            const match = coinTypeFull.match(/<([^>]+)>/); // extract "0x2::sui::SUI" from the full type
            if (!match) {
                throw new Error(`Failed to parse the Coin type from the object type: ${coinTypeFull}`);
            }
            const coinType = match[1];
            console.log(`COIN_ID type: ${coinType}`);

            // Get COIN_ID symbol and decimals
            const coinMetadata = await suiClient.getCoinMetadata({ coinType });
            if (!coinMetadata) {
                throw new Error(`Failed to get CoinMetadata for COIN_ID type`);
            }
            const coinSymbol = coinMetadata.symbol;
            const coinDecimals = coinMetadata.decimals;
            const decimalMultiplier = BigInt(10**coinDecimals);
            console.log(`COIN_ID symbol: ${coinSymbol}`);
            console.log(`COIN_ID decimals: ${coinDecimals}`);

            // Get COIN_ID balance
            const coinBalanceDecimals = BigInt((coinObject.data.content.fields as any).balance);
            const coinBalanceNoDecimals = coinBalanceDecimals / decimalMultiplier;
            console.log(`COIN_ID balance: ${formatNumber(coinBalanceNoDecimals)} (${coinBalanceDecimals})`);

            // Read addresses and amounts from input file
            const addressAmountPairs = readCsvFile<AddressAmountPair>(this.inputFile, parseCsvLine);
            console.log(`\nFound ${addressAmountPairs.length} addresses in ${this.inputFile}`);
            const batches = chunkArray(addressAmountPairs, BATCH_SIZE);
            console.log(`Airdrop will be done in ${batches.length} batches`);
            console.log(`Gas estimate: ${formatNumber(GAS_PER_ADDRESS*addressAmountPairs.length)} SUI`);
            const totalAmountNoDecimals = addressAmountPairs.reduce((sum, pair) => sum + pair.amount, BigInt(0));
            const totalAmountDecimals = totalAmountNoDecimals * decimalMultiplier;
            console.log(`Total amount to be sent: ${formatNumber(totalAmountNoDecimals)} (${totalAmountDecimals})`);

            // Abort if COIN_ID doesn't have enough balance
            if (totalAmountDecimals > coinBalanceDecimals) {
                throw new Error(`Total amount to be sent is bigger than COIN_ID balance`);
            }

            // Get user confirmation before proceeding
            const userConfirmed = await promptUser('\nDoes this look okay? (y/n) ');
            if (!userConfirmed) {
                console.log('Execution aborted by the user.');
                return;
            }

            /* Send Coin<T> to each address */

            let totalGas = 0;
            let batchNumber = 0;
            try {
                const packageId = PACKAGE_IDS.get(networkName) as NetworkName;
                for (const batch of batches) {
                    batchNumber++;
                    const batchAmount = batch.reduce((total, pair) => total + pair.amount, BigInt(0));
                    this.logTransactionStart(batchAmount, batchNumber, batch);

                    const txb = new TransactionBlock();
                    const payCoin = txb.splitCoins(this.coinId, [batchAmount * decimalMultiplier]);
                    txb.moveCall({
                        target: `${packageId}::bulksender::send`,
                        typeArguments: [ coinType ],
                        arguments: [
                            payCoin,
                            txb.pure(batch.map(pair => pair.amount * decimalMultiplier)),
                            txb.pure(batch.map(pair => pair.address)),
                        ],
                    });

                    const result = await suiClient.signAndExecuteTransactionBlock({
                        signer,
                        transactionBlock: txb,
                        options: {
                            showEffects: true,
                            showObjectChanges: true,
                        }
                    });

                    if (result.effects?.status.status !== 'success') {
                        throw new Error(`Transaction status was '${result.effects?.status.status}': ${result.digest}`);
                    }

                    if (result.effects?.created?.length !== batch.length) {
                        throw new Error(`Transaction created ${result.effects?.created?.length} objects `
                        + `for ${batch.length} addresses: ${result.digest}`);
                    }

                    this.logText(`Transaction successful: ${result.digest}`);

                    const gas = result.effects.gasUsed;
                    totalGas += Number(gas.computationCost) + Number(gas.storageCost) - Number(gas.storageRebate);

                    // Wait a bit to stay below the public RPC rate limit
                    if (networkName !== 'localnet') {
                        await sleep(RATE_LIMIT_DELAY);
                    }
                }
                console.log('\nDone!')
                console.log(`Gas used: ${totalGas / 1_000_000_000} SUI\n`);
            }
            catch (error) {
                this.logText(String(error));
                throw(error);
            }
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * Output looks like this:
     * ```
     * 2023-12-06T09:42:05.963Z - Sending to batch 1 (180 addresses): 0x326c, 0x445e, ...
     * ```
     */
    private logTransactionStart(batchAmount: bigint, batchNumber: number, batch: AddressAmountPair[]) {
        const shortText = `Sending ${batchAmount} to batch ${batchNumber} (${batch.length} addresses)`;
        console.log(shortText);
        const addresses = batch.map(pair => pair.address.substring(0, 6)).join(', ');
        const longText = `${shortText}: ${addresses}`;
        this.logText(longText);
    }

    private logText(text: string) {
        const date = new Date().toISOString();
        const logEntry = `${date} - ${text}\n`;
        appendFileSync(this.outputFile, logEntry);
    }
}

type AddressAmountPair = {
    address: string;
    amount: bigint;
}

/**
 * It expects the 1st column to be the owner address and the 2nd column to be the amount to be sent.
 */
function parseCsvLine(values: string[]): AddressAmountPair | null {
    const [addressStr, amountStr] = values;

    const address = validateAndNormalizeSuiAddress(addressStr);

    if (address === null) {
        console.debug(`[parseCsvLine] Skipping line with invalid owner: ${addressStr}`);
        return null;
    }

    const amount = BigInt(amountStr);

    return { address, amount };

}
