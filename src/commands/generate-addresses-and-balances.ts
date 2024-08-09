import { generateRandomAddress } from "@polymedia/suitcase-core";

export class GenerateAddressesAndBalancesCommand
{
    private amount = 0;

    public execute(args: string[]): Promise<void>
    {
        /* Read command arguments */

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
