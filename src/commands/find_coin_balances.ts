import { readJsonFile, writeJsonFile } from '../utils/file_utils.js';
import { SuiClientRotator, SuiClientWithEndpoint } from '../utils/sui_utils.js';
import { AddressAndBalance, Command } from '../types.js';

export class FindCoinBalancesCommand extends Command {
    private coinType = '';
    private inputFile = './data/find_coin_holders.json';
    private outputFile = './data/find_coin_balances.json';

    constructor(args: string[]) {
        super(args);
        this.coinType = args[0] || this.coinType;
        this.inputFile = args[1] || this.inputFile;
        this.outputFile = args[2] || this.outputFile;
    }

    public getDescription(): string {
        return 'Find how much Coin<T> is owned by each address';
    }

    public getUsage(): string {
        return `${this.getDescription()}

Usage:
  find_coin_balances <COIN_TYPE> [INPUT_FILE] [OUTPUT_FILE]

Arguments:
  COIN_TYPE    - Required. The T in Coin<T>
  INPUT_FILE   - Optional. Path to the input file. Default is '${this.inputFile}'
  OUTPUT_FILE  - Optional. Path to the output file. Default is '${this.outputFile}'

Example:
  find_coin_balances 0x123::lol::LOL ./custom/input.json ./custom/output.json
`;
    }

    public async execute(): Promise<void>
    {
        console.log(`coinType: ${this.coinType}`);
        console.log(`inputFile: ${this.inputFile}`);
        console.log(`outputFile: ${this.outputFile}`);

        const inputs: AddressAndBalance[] = readJsonFile(this.inputFile);
        console.log(`Fetching ${inputs.length} balances in batches...`);

        const rotator = new SuiClientRotator();
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
        const balances = await rotator.executeInBatches(inputs, fetchBalance);

        writeJsonFile(this.outputFile, balances);
    }
}
