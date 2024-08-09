import { readJsonFile, writeCsvFile } from "@polymedia/suitcase-node";
import { ZuiCommand } from "../types.js";
import { AddressAndBalance } from "../types.js";

export class TransformBalancesJsonToCsvCommand implements ZuiCommand
{
    private decimals = 0;
    private inputFile = "";
    private outputFile = "";

    public execute(args: string[]): Promise<void>
    {
        /* Read command arguments */

        this.decimals = Number(args[0]);
        this.inputFile = args[1];
        this.outputFile = args[2];
        console.log(`decimals: ${this.decimals}`);
        console.log(`inputFile: ${this.inputFile}`);
        console.log(`outputFile: ${this.outputFile}`);
        const decimalsDivider = 10**this.decimals;

        /* Find how much Coin<T> is owned by each address */

        const inputs = readJsonFile<AddressAndBalance[]>(this.inputFile);
        const lines: (string|number)[][] = [];
        lines.push(["address", "balance"]);
        for (const input of inputs) {
            if (input.balance == 0) {
                continue;
            }
            lines.push([input.address, input.balance / decimalsDivider]);
        }
        writeCsvFile(this.outputFile, lines);

        return Promise.resolve();
    }

}
