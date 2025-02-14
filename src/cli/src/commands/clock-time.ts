import { bcs } from "@mysten/sui/bcs";
import { Transaction } from "@mysten/sui/transactions";

import { devInspectAndGetReturnValues } from "@polymedia/suitcase-core";
import { setupSuiTransaction } from "@polymedia/suitcase-node";

const validTimeFormats = ["ts", "iso", "local"] as const;

export async function clockTime({
    format = "ts",
}: {
    format?: (typeof validTimeFormats)[number];
}): Promise<void>
{
    const { client } = await setupSuiTransaction();

    if (!validTimeFormats.includes(format)) {
        console.error(`error: invalid time format "${format}"`);
        console.log(`valid formats: ${validTimeFormats.join(", ")}`);
        process.exit(1);
    }

    const tx = new Transaction();
    tx.moveCall({
        target: "0x2::clock::timestamp_ms",
        arguments: [ tx.object.clock() ],
    });
    const [clock] = await devInspectAndGetReturnValues(client, tx, [
        [bcs.U64],
    ]);

    const timestamp = String(clock[0]);
    const date = new Date(Number(timestamp));
    const str =
          format === "ts"    ? timestamp
        : format === "iso"   ? date.toISOString()
        : format === "local" ? date.toLocaleString()
        : "not supported";

    console.log(str);
}
