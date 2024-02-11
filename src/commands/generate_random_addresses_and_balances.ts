import { generateRandomAddress } from '@polymedia/suits';
import { Command } from '../Commando.js';

export class GenerateRandomAddressesAndBalancesCommand implements Command {
    private amount = 0;

    public getDescription(): string {
        return 'Generate random Sui addresses and balances';
    }

    public getUsage(): string {
        return `${this.getDescription()}

Usage:
  generate_random_addresses_and_balances AMOUNT

Arguments:
  AMOUNT    The amount of address-balance pairs to generate

Example:
  generate_random_addresses_and_balances 5000
`;
    }

    public async execute(args: string[]): Promise<void>
    {
        /* Read command arguments */

        if (args.length !== 1) {
            console.log(this.getUsage());
            return;
        }
        this.amount = Number(args[0]);

        /* Generate random addresses and balances */

        for (let index = 0; index < this.amount; index++) {
            const address = generateRandomAddress();
            const amount = Math.floor(Math.random() * (1_000_000 - 1_000 + 1)) + 1_000;
            console.log(`${address},${amount}`);
        }
    }
}
