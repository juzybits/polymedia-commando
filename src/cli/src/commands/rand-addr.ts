import { generateRandomAddress } from "@polymedia/suitcase-core";

export async function randAddr({
    amount,
    withBalance = false,
}: {
    amount: number;
    withBalance: boolean;
}): Promise<void>
{
    for (let index = 0; index < amount; index++) {
        const address = generateRandomAddress();
        if (withBalance) {
            const amount = (Math.random() / 100).toFixed(9);
            if (global.outputJson) {
                console.log({ address, amount });
            } else {
                console.log(`${address},${amount}`);
            }
        } else {
            if (global.outputJson) {
                console.log({ address });
            } else {
                console.log(address);
            }
        }
    }
    return Promise.resolve();
}
