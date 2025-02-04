import { Transaction } from "@mysten/sui/transactions";

import { signAndExecuteTx, setupSuiTransaction } from "@polymedia/suitcase-node";

import { log, debug } from "../logger.js";

export async function sendZero({
    number, coinType, recipient,
}: {
    number: number;
    coinType: string;
    recipient: string;
}): Promise<void>
{
    const { client, signer } = await setupSuiTransaction();

    const tx = new Transaction();
    for (let i = 0; i < number; i++) {
        const [coin] = tx.moveCall({
            target: "0x2::coin::zero",
            typeArguments: [coinType],
        });
        tx.transferObjects([coin], recipient);
    }

    const resp = await signAndExecuteTx({ client, tx, signer, waitForTxOptions: false });
    debug("Response", resp);
    log("tx status", resp.effects?.status.status);
    log("tx digest", resp.digest);
}
