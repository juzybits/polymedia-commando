import { Transaction } from "@mysten/sui/transactions";

import { signAndExecuteTx, setupSuiTransaction } from "@polymedia/suitcase-node";

import { MAX_PROGRAMMABLE_TX_COMMANDS } from "../config.js";
import { log, debug } from "../logger.js";

// note: could be more efficient with a contract:
// fun send<T>(recipient, number_of_coins) // create and transfer under the hood

const MAX_FN_CALLS_PER_TX = MAX_PROGRAMMABLE_TX_COMMANDS / 2 - 1;

export async function coinSendZero({
    number, coinType, recipient,
}: {
    number: number;
    coinType: string;
    recipient: string;
}): Promise<void>
{
    const { client, signer } = await setupSuiTransaction();
    let totalGas = 0;
    let batchNumber = 0;
    const totalBatches = Math.ceil(number / MAX_FN_CALLS_PER_TX);

    async function sendBatch(numberOfCoins: number)
    {
        batchNumber++;
        log(`Sending tx ${batchNumber}/${totalBatches} with ${numberOfCoins} coins...`);
        const tx = new Transaction();
        for (let i = 0; i < numberOfCoins; i++) {
            const [coin] = tx.moveCall({
                target: "0x2::coin::zero",
                typeArguments: [coinType],
            });
            tx.transferObjects([coin], recipient);
        }
        const resp = await signAndExecuteTx({ client, tx, signer });
        debug("tx response", resp);
        log("tx status", resp.effects?.status.status);
        log("tx digest", resp.digest);

        const gas = resp.effects!.gasUsed;
        totalGas += Number(gas.computationCost) + Number(gas.storageCost) - Number(gas.storageRebate);
    }

    const numFullBatches = Math.floor(number / MAX_FN_CALLS_PER_TX);
    const remainingCalls = number % MAX_FN_CALLS_PER_TX;

    for (let batch = 0; batch < numFullBatches; batch++) {
        await sendBatch(MAX_FN_CALLS_PER_TX);
    }
    if (remainingCalls > 0) {
        await sendBatch(remainingCalls);
    }

    log(`Gas used: ${totalGas / 1_000_000_000} SUI`);
}
