import { bcs } from "@mysten/sui/bcs";
import { Transaction } from "@mysten/sui/transactions";
import { devInspectAndGetReturnValues } from "@polymedia/suitcase-core";
import { setupSuiTransaction } from "@polymedia/suitcase-node";

export async function clockTime(): Promise<void>
{
    const { client } = await setupSuiTransaction();

    const tx = new Transaction();
    tx.moveCall({
        target: "0x2::clock::timestamp_ms",
        arguments: [ tx.object.clock() ],
    });
    const [clock] = await devInspectAndGetReturnValues(client, tx, [
        [bcs.U64],
    ]);
    console.log(clock[0]);
}
