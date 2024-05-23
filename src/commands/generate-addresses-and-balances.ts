import { generateRandomAddress } from "@polymedia/suitcase-core";
import { Command } from "../Commando.js";

export class GenerateAddressesAndBalancesCommand implements Command {
    private amount = 0;

    public getDescription(): string {
        return "Generate random Sui addresses and balances (for testing)";
    }

    public getUsage(): string {
        return `${this.getDescription()}

Usage:
  generate-addresses-and-balances AMOUNT

Arguments:
  AMOUNT    The amount of address-balance pairs to generate

Example:
  generate-addresses-and-balances 5000
`;
    }

    public execute(args: string[]): Promise<void>
    {
        /* Read command arguments */

        if (args.length !== 1) {
            console.log(this.getUsage());
            return Promise.resolve();
        }
        this.amount = Number(args[0]);

        /* Generate random addresses and balances */

        for (let index = 0; index < this.amount; index++) {
            const address = generateRandomAddress();
            const amount = Math.floor(Math.random() * (1_000_000 - 1_000 + 1)) + 1_000;
            console.log(`${address},${amount}`);
        }
        return Promise.resolve();
    }
}
