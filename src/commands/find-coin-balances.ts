import { SuiClientWithEndpoint, SuiMultiClient } from "@polymedia/suitcase-core";
import { getActiveEnv, readJsonFile, writeJsonFile } from "@polymedia/suitcase-node";
import { ZuiCommand } from "../types.js";
import { AddressAndBalance } from "../types.js";

export class FindCoinBalancesCommand implements ZuiCommand
{
    private coinType = "";
    private inputFile = "";
    private outputFile = "";

    public async execute(args: string[]): Promise<void>
    {
        /* Read command arguments */

        this.coinType = args[0];
        this.inputFile = args[1];
        this.outputFile = args[2];
        console.log(`coinType: ${this.coinType}`);
        console.log(`inputFile: ${this.inputFile}`);
        console.log(`outputFile: ${this.outputFile}`);

        /* Find how much Coin<T> is owned by each address */

        const inputs = readJsonFile<AddressAndBalance[]>(this.inputFile);
        console.log(`Fetching ${inputs.length} balances in batches...`);

        const multiClient = SuiMultiClient.newWithDefaultEndpoints(getActiveEnv());
        const fetchBalance = (client: SuiClientWithEndpoint, input: AddressAndBalance) => {
            return client.getBalance({
                owner: input.address,
                coinType: this.coinType,
            }).then(balance => {
                return { address: input.address, balance: balance.totalBalance };
            }).catch((error: unknown) => {
                console.error(`Error getting balance for address ${input.address} from rpc ${client.endpoint}: ${error}`);
                throw error;
            });
        };
        const balances = await multiClient.executeInBatches(inputs, fetchBalance);

        writeJsonFile(this.outputFile, balances);
    }
}
