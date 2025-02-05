import { SuiClientWithEndpoint, SuiMultiClient, validateAndNormalizeAddress } from "@polymedia/suitcase-core";
import { getActiveEnv, ParseLine, readCsvFile, readJsonFile, readTsvFile } from "@polymedia/suitcase-node";

import { error } from "../logger.js";

export async function findLastTx({
    addresses, inputFile,
}: {
    addresses?: string[];
    inputFile?: string;
}): Promise<void>
{
    if (!addresses && !inputFile) {
        error("either --address or --input-file must be provided");
        process.exit(1);
    }

    if (!addresses && inputFile) {
        if (inputFile.endsWith(".json")) {
            addresses = readJsonFile<string[]>(inputFile);
        } else if (inputFile.endsWith(".csv")) {
            addresses = readCsvFile(inputFile, parseLine);
        } else if (inputFile.endsWith(".tsv")) {
            addresses = readTsvFile(inputFile, parseLine);
        } else { // plain text
            addresses = readCsvFile(inputFile, parseLine);
        }
    }

    const multiClient = SuiMultiClient.newWithDefaultEndpoints(await getActiveEnv());
    const lastTxns = await multiClient.executeInBatches(addresses!, fetchLastTxn);
    console.log(JSON.stringify(lastTxns, null, 2));
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
    }).catch((err: unknown) => {
        error(`Error getting last transaction for address ${address} from rpc ${client.endpoint}: ${err}`);
        process.exit(1);
    });
}

const parseLine: ParseLine<string> = (values) => validateAndNormalizeAddress(values[0]);
