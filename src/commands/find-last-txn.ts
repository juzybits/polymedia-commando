import { SuiClientWithEndpoint, SuiMultiClient } from "@polymedia/suitcase-core";
import { getActiveEnv, readJsonFile, writeJsonFile } from "@polymedia/suitcase-node";
import { ZuiCommand } from "../types.js";
import { AddressAndBalance } from "../types.js";

export class FindLastTransactionCommand implements ZuiCommand
{
    private inputFile = "./data/find-coin-holders.json";
    private outputFile = "./data/find-last-txn.json";

    public async execute(args: string[]): Promise<void>
    {
        /* Read command arguments */

        this.inputFile = args[0];
        this.outputFile = args[1];
        console.log(`inputFile: ${this.inputFile}`);
        console.log(`outputFile: ${this.outputFile}`);

        /* Find last transactions */

        const inputs = readJsonFile<AddressAndBalance[]>(this.inputFile);
        const multiClient = SuiMultiClient.newWithDefaultEndpoints(getActiveEnv());
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
        order: "descending",
    }).then(paginatedResp => {
        const resp = paginatedResp.data.length ? paginatedResp.data[0] : null;
        return {
            address: input.address,
            txnId: resp ? resp.digest : null,
            txnTime: resp ? (resp.timestampMs ?? null) : null,
        };
    }).catch((error: unknown) => {
        console.error(`Error getting last transaction for address ${input.address} from rpc ${client.endpoint}: ${error}`, error);
        throw error;
    });
}
