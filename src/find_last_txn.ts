import { readJsonFile, writeJsonFile } from './common/file_utils.js';
import { SuiClientRotator, SuiClientWithEndpoint } from './common/sui_utils.js';
import { AddressAndBalance } from './types.js';

let INPUT_FILE = './data/find_coin_holders.json';
let OUTPUT_FILE = './data/find_last_txn.json';

const USAGE = `
Find the last transaction for each Sui address

Usage: pnpm find_last_txn [INPUT_FILE] [OUTPUT_FILE]

Arguments:
  INPUT_FILE   - Optional. Path to the input file. Default is '${INPUT_FILE}'
  OUTPUT_FILE  - Optional. Path to the output file. Default is '${OUTPUT_FILE}'

Example:
  pnpm find_last_txn ./custom/input.json ./custom/output.json
`;

function printUsage() {
    console.log(USAGE);
}

async function main()
{
    /* Read and validate inputs */

    const args = process.argv.slice(2);

    if (args.includes('-h') || args.includes('--help')) {
        printUsage();
        return;
    }

    INPUT_FILE = args[0] || INPUT_FILE;
    OUTPUT_FILE = args[1] || OUTPUT_FILE;
    console.log(`INPUT_FILE: ${INPUT_FILE}`);
    console.log(`OUTPUT_FILE: ${OUTPUT_FILE}`);

    /* Fetch last transaction for each address */

    const inputs: AddressAndBalance[] = readJsonFile(INPUT_FILE);
    console.log(`Fetching last transaction for ${inputs.length} addresses in batches...`);

    const rotator = new SuiClientRotator();
    const fetchLastTxn = async (client: SuiClientWithEndpoint, input: AddressAndBalance) => {
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
    };
    const lastTxns = await rotator.executeInBatches(inputs, fetchLastTxn);

    writeJsonFile(OUTPUT_FILE, lastTxns);
}

main();

export {};
