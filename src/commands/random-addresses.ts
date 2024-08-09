import { generateRandomAddress } from "@polymedia/suitcase-core";

export async function randomAddresses(
    amount: number,
    withBalance = false,
): Promise<void>
{
    for (let index = 0; index < amount; index++) {
        const address = generateRandomAddress();
        if (withBalance) {
            const amount = Math.floor(Math.random() * (1_000_000 - 1_000 + 1)) + 1_000;
            console.log(`${address},${amount}`);
        } else {
            console.log(address);
        }
    }
    return Promise.resolve();
}
