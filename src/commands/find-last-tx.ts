import { SuiClientWithEndpoint, SuiMultiClient } from "@polymedia/suitcase-core";
import { getActiveEnv, readJsonFile, writeJsonFile } from "@polymedia/suitcase-node";

export async function findLastTx(
    inputFile: string,
    outputFile: string,
): Promise<void>
{
    console.log(`inputFile: ${inputFile}`);
    console.log(`outputFile: ${outputFile}`);

    const addresses = readJsonFile<string[]>(inputFile);
    const multiClient = SuiMultiClient.newWithDefaultEndpoints(getActiveEnv());
    const lastTxns = await multiClient.executeInBatches(addresses, fetchLastTxn);
    writeJsonFile(outputFile, lastTxns);
}

type LastTxn = {
    address: string;
    txnId: string | null;
    txnTime: string | null;
};

async function fetchLastTxn(
    client: SuiClientWithEndpoint,
    address: string,
): Promise<LastTxn> {
    return client.queryTransactionBlocks({
        filter: { FromAddress: address },
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
            address: address,
            txnId: resp ? resp.digest : null,
            txnTime: resp ? (resp.timestampMs ?? null) : null,
        };
    }).catch((error: unknown) => {
        console.error(`Error getting last transaction for address ${address} from rpc ${client.endpoint}: ${error}`, error);
        throw error;
    });
}
