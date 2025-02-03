import fs from "fs";

import { setupSuiTransaction, signAndExecuteTx } from "@polymedia/suitcase-node";

export async function bytecodePublish({
    bytecodeFiles,
}:{
    bytecodeFiles: string[];
}): Promise<void>
{
    if (bytecodeFiles.length === 0) {
        throw new Error("no bytecode files specified");
    }

    // make sure all files exist
    for (const file of bytecodeFiles) {
        if (!fs.existsSync(file)) {
            throw new Error(`file not found: ${file}`);
        }
    }

    const { network, client, tx, signer } = await setupSuiTransaction();
    const sender = signer.toSuiAddress();

    console.log("Active network:", network);
    console.log("Active address:", sender);

    console.log("Reading bytecode files...");
    const bytecodes: number[][] = [];
    for (const file of bytecodeFiles) {
        const bytecode = fs.readFileSync(file);
        bytecodes.push(Array.from(bytecode));
    }

    console.log("Building transaction...");
    const [upgradeCap] = tx.publish({
        modules: bytecodes,
        dependencies: [ "0x1", "0x2" ],
    });
    tx.transferObjects([upgradeCap], sender);

    console.log("Publishing package...");
    const result = await signAndExecuteTx({ client, tx, signer, txRespOptions: { showEffects: true } });

    if (result.effects?.status.status !== "success") {
        console.error(JSON.stringify(result.effects, null, 2));
        throw new Error("Publish failed");
    }

    console.log("Success! Result:");
    console.log(JSON.stringify(result, null, 2));
    console.log("Status:", result.effects?.status.status);
    console.log("Digest:", result.digest);
}
