import { Command } from '../Commando.js';
import { readJsonFile, writeJsonFile } from '../lib/file_utils.js';
import { MultiSuiClient, SuiClientWithEndpoint } from '../lib/sui_utils.js';
import { AddressAndBalance } from '../types.js';

export class FindLastTransactionCommand implements Command {
    private inputFile: string = './data/find_coin_holders.json';
    private outputFile: string = './data/find_last_txn.json';

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

    public async execute(args: string[]): Promise<void>
    {
        /* Read command arguments */

        this.inputFile = args[0] || this.inputFile;
        this.outputFile = args[1] || this.outputFile;
        console.log(`inputFile: ${this.inputFile}`);
        console.log(`outputFile: ${this.outputFile}`);

        /* Find last transactions */

        const inputs: AddressAndBalance[] = readJsonFile(this.inputFile);
        const multiClient = new MultiSuiClient();
        const lastTxns = await multiClient.executeInBatches(inputs, fetchLastTxn);
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
