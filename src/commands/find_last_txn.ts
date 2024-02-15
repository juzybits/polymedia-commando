import { SuiMultiClient, SuiClientWithEndpoint } from '@polymedia/suits';
import { Command } from '../Commando.js';
import { AddressAndBalance } from '../types.js';
import { readJsonFile, writeJsonFile } from '../utils-file.js';

export class FindLastTransactionCommand implements Command {
    private inputFile = './data/find_coin_holders.json';
    private outputFile = './data/find_last_txn.json';

    public getDescription(): string {
        return 'Find the last transaction for each Sui address';
    }

    public getUsage(): string {
        return `${this.getDescription()}

Usage:
  find_last_txn INPUT_FILE OUTPUT_FILE

Arguments:
  INPUT_FILE    JSON file with addresses and balances. Format:
                [ { address: string, balance: number }, ... ]
  OUTPUT_FILE   JSON file with addresses and their last transaction ID and time. Format:
                [
                    {
                        address: string,
                        txnId: string | null,
                        txnTime: string | null,
                    },
                    ...
                ]

Example:
  find_last_txn addresses.json last_txns.json
`;
    }

    public async execute(args: string[]): Promise<void>
    {
        /* Read command arguments */

        if (args.length !== 2) {
            console.log(this.getUsage());
            return;
        }
        this.inputFile = args[0];
        this.outputFile = args[1];
        console.log(`inputFile: ${this.inputFile}`);
        console.log(`outputFile: ${this.outputFile}`);

        /* Find last transactions */

        const inputs: AddressAndBalance[] = readJsonFile(this.inputFile);
        const multiClient = new SuiMultiClient();
        const lastTxns = await multiClient.executeInBatches(inputs, fetchLastTxn);
        writeJsonFile(this.outputFile, lastTxns);
    }
}

type LastTxn = {
    address: string;
    txnId: string | null;
    txnTime: string | null;
};
async function fetchLastTxn(client: SuiClientWithEndpoint, input: AddressAndBalance): Promise<LastTxn> {
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
            txnTime: resp ? (resp.timestampMs ?? null) : null,
        };
    }).catch(error => {
        console.error(`Error getting last transaction for address ${input.address} from rpc ${client.endpoint}: ${error}`, error);
        throw error;
    });
}
