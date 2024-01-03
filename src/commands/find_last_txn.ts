import { readJsonFile, writeJsonFile } from '../utils/file_utils.js';
import { SuiClientRotator, SuiClientWithEndpoint } from '../utils/sui_utils.js';
import { AddressAndBalance, Command } from '../types.js';

export class FindLastTxnCommand extends Command {
    private inputFile = './data/find_coin_holders.json';
    private outputFile = './data/find_last_txn.json';

    constructor(args: string[]) {
        super(args);
        this.inputFile = args[0] || this.inputFile;
        this.outputFile = args[1] || this.outputFile;
    }

    public getDescription(): string {
        return 'Find the last transaction for each Sui address';
    }

    public getUsage(): string {
        return `${this.getDescription()}

Usage:
  find_last_txn [INPUT_FILE] [OUTPUT_FILE]

Arguments:
  INPUT_FILE   - Optional. Path to the input file. Default is '${this.inputFile}'
  OUTPUT_FILE  - Optional. Path to the output file. Default is '${this.outputFile}'

Example:
  find_last_txn ./custom/input.json ./custom/output.json
`;
    }

    public async execute(): Promise<void> {
        console.log(`inputFile: ${this.inputFile}`);
        console.log(`outputFile: ${this.outputFile}`);

        const inputs: AddressAndBalance[] = readJsonFile(this.inputFile);
        const rotator = new SuiClientRotator();
        const lastTxns = await rotator.executeInBatches(inputs, fetchLastTxn);
        writeJsonFile(this.outputFile, lastTxns);
    }
}

async function fetchLastTxn(client: SuiClientWithEndpoint, input: AddressAndBalance): Promise<any> {
    return client.queryTransactionBlocks({
        filter: { FromAddress: input.address },
        options: {
            // showBalanceChanges: true,
            // showEffects: true,
            // showEvents: true,
            // showInput: true,
            // showObjectChanges: true,
            showRawInput: true, // only to get timestampMs
        },
        limit: 1,
        order: 'descending',
    }).then(paginatedResp => {
        const resp = paginatedResp.data.length ? paginatedResp.data[0] : null;
        return {
            address: input.address,
            txnId: resp ? resp.digest : null,
            txnTime: resp ? resp.timestampMs : null,
        };
    }).catch(error => {
        console.error(`Error getting last transaction for address ${input.address} from rpc ${client.endpoint}: ${error}`, error);
        throw error;
    });
}
