import { generateRandomAddress } from "@polymedia/suitcase-core";

export async function randAddr(
    amount: number,
    withBalance = false,
): Promise<void>
{
    for (let index = 0; index < amount; index++) {
        const address = generateRandomAddress();
        if (withBalance) {
            const amount = (Math.random() / 100).toFixed(9);
            console.log(`${address},${amount}`);
        } else {
            console.log(address);
        }
    }
    return Promise.resolve();
}
