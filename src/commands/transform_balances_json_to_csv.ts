import { Command } from '../Commando.js';
import { readJsonFile, writeCsvFile } from '../lib/file_utils.js';
import { AddressAndBalance } from '../types.js';

export class TransformBalancesJsonToCsvCommand implements Command {
    private decimals = 0;
    private inputFile = '';
    private outputFile = '';

    public getDescription(): string {
        return 'Transform a .json file containing addresses and balances into a .csv file';
    }

    public getUsage(): string {
        return `${this.getDescription()}

Usage:
  transform_balances_json_to_csv DECIMALS INPUT_FILE OUTPUT_FILE

Arguments:
  DECIMALS      Number of decimals for Coin<T>
  INPUT_FILE    JSON file with addresses and balances (with decimals). Format:
                [ { address: string, balance: number }, ... ]
  OUTPUT_FILE   CSV file with addresses and balances (without decimals). Format:
                "address","balance"
                "0xbeef","123"

Example:
  transform_balances_json_to_csv balances.json balances.csv
`;
    }

    public async execute(args: string[]): Promise<void>
    {
        /* Read command arguments */

        if (args.length !== 3) {
          console.log(this.getUsage());
          return;
      }
        this.decimals = Number(args[0]);
        this.inputFile = args[1];
        this.outputFile = args[2];
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
