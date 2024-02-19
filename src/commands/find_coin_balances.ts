import { SuiClientWithEndpoint, SuiMultiClient } from '@polymedia/suits';
import { Command } from '../Commando.js';
import { AddressAndBalance } from '../types.js';
import { readJsonFile, writeJsonFile } from '../utils-file.js';
import { getActiveEnv } from '../utils-sui.js';

export class FindCoinBalancesCommand implements Command {
    private coinType = '';
    private inputFile = '';
    private outputFile = '';

    public getDescription(): string {
        return 'Find how much Coin<T> is owned by each address';
    }

    public getUsage(): string {
        return `${this.getDescription()}

This script is designed to process the output of \`find_coin_holders\`, which contains
inaccurate balances, and fetch the correct balances directly from Sui RPC servers.

Usage:
  find_coin_balances COIN_TYPE INPUT_FILE OUTPUT_FILE

Arguments:
  COIN_TYPE     The type of the coin (the T in Coin<T>)
  INPUT_FILE    JSON file with addresses and (ignored) balances. Format:
                [ { address: string, balance: number }, ... ]
  OUTPUT_FILE   JSON file with addresses and (correct) balances. Format:
                [ { address: string, balance: number }, ... ]

Example:
  find_coin_balances 0x123::lol::LOL coin_holders.json coin_balances.json
`;
    }

    public async execute(args: string[]): Promise<void>
    {
        /* Read command arguments */

        if (args.length !== 3) {
            console.log(this.getUsage());
            return;
        }
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
            }).catch(error => {
                console.error(`Error getting balance for address ${input.address} from rpc ${client.endpoint}: ${error}`);
                throw error;
            });
        };
        const balances = await multiClient.executeInBatches(inputs, fetchBalance);

        writeJsonFile(this.outputFile, balances);
    }
}
