import { generateRandomAddress } from './common/sui_utils.js';

async function main()
{
    for (let index = 0; index < 10000; index++) {
        const address = generateRandomAddress();
        const amount = Math.floor(Math.random() * (1_000_000 - 1_000 + 1)) + 1_000;
        console.log(`${address},${amount}`);
    }
}

main();

export {};
