import { BaseCommand } from '../Commando.js';
import { readJsonFile, writeJsonFile } from '../common/file_utils.js';
import { SuiClientRotator, SuiClientWithEndpoint } from '../common/sui_utils.js';
import { AddressAndBalance } from '../types.js';

class FindLastTransactionCommand implements BaseCommand {
    private input_file: string = './data/find_coin_holders.json';
    private output_file: string = './data/find_last_txn.json';

    public getDescription(): string {
        return 'Find the last transaction for each Sui address';
    }

    public getUsage(): string {
        return `
${this.getDescription()}

Usage: find_last_txn [INPUT_FILE] [OUTPUT_FILE]

Arguments:
  INPUT_FILE   - Optional. Path to the input file. Default is '${this.input_file}'
  OUTPUT_FILE  - Optional. Path to the output file. Default is '${this.output_file}'

Example:
  find_last_txn ./custom/input.json ./custom/output.json
`;
    }

    public async execute(args: string[]): Promise<void> {
        this.input_file = args[0] || this.input_file;
        this.output_file = args[1] || this.output_file;

        const inputs: AddressAndBalance[] = readJsonFile(this.input_file);
        const rotator = new SuiClientRotator();
        const lastTxns = await rotator.executeInBatches(inputs, fetchLastTxn);
        writeJsonFile(this.output_file, lastTxns);
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

export { FindLastTransactionCommand };
