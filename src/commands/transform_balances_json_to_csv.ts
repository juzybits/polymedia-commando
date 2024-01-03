import { Command } from '../Commando.js';
import { readJsonFile, writeCsvFile } from '../common/file_utils.js';
import { AddressAndBalance } from '../types.js';

export class TransformBalancesJsonToCsvCommand implements Command {
    private decimals = 0;
    private inputFile = './data/find_coin_balances.json';
    private outputFile = './data/transform_balances_json_to_csv.csv';

    public getDescription(): string {
        return 'Transform a .json file containing addresses and balances into a .csv file';
    }

    public getUsage(): string {
        return `${this.getDescription()}

Usage:
  transform_balances_json_to_csv DECIMALS [INPUT_FILE] [OUTPUT_FILE]

Arguments:
  DECIMALS     - Number of decimals for Coin<T>
  INPUT_FILE   - Optional. Path to the input file. Default is ${this.inputFile}'
  OUTPUT_FILE  - Optional. Path to the output file. Default is ${this.outputFile}'

Example:
  transform_balances_json_to_csv ./custom/input.json ./custom/output.json
`;
    }

    public async execute(args: string[]): Promise<void>
    {
        /* Read command arguments */

        this.decimals = Number(args[0]) || this.decimals;
        this.inputFile = args[1] || this.inputFile;
        this.outputFile = args[2] || this.outputFile;
        console.log(`decimals: ${this.decimals}`);
        console.log(`inputFile: ${this.inputFile}`);
        console.log(`outputFile: ${this.outputFile}`);
        const decimalsDivider = 10**this.decimals;

        /* Find how much Coin<T> is owned by each address */

        const inputs: AddressAndBalance[] = readJsonFile(this.inputFile);
        const lines: (string|number)[][] = [];
        lines.push(['address', 'balance']);
        for (const input of inputs) {
            if (input.balance == 0) {
                continue;
            }
            lines.push([input.address, input.balance / decimalsDivider]);
        }
        writeCsvFile(this.outputFile, lines);

    }

}
