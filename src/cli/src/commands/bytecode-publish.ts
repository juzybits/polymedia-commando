import fs from "fs";

import { validateAndNormalizeAddress } from "@polymedia/suitcase-core";
import { setupSuiTransaction, signAndExecuteTx } from "@polymedia/suitcase-node";

export async function bytecodePublish({
    bytecodeFiles,
    dependencies = [],
}:{
    bytecodeFiles: string[];
    dependencies?: string[];
}): Promise<void>
{
    // validate bytecode files
    if (bytecodeFiles.length === 0) {
        throw new Error("no bytecode files specified");
    }
    for (const file of bytecodeFiles) {
        if (!fs.existsSync(file)) {
            throw new Error(`file not found: ${file}`);
        }
    }
    // read bytecode files
    console.log("Reading bytecode files...");
    const bytecodes: number[][] = [];
    for (const file of bytecodeFiles) {
        const bytecode = fs.readFileSync(file);
        bytecodes.push(Array.from(bytecode));
    }

    // validate and normalize dependencies
    const normalizedDeps = dependencies.map(dep => {
        const normalized = validateAndNormalizeAddress(dep);
        if (!normalized) {
            throw new Error(`Invalid dependency address: ${dep}`);
        }
        return normalized;
    });
    // always include 0x1 and 0x2
    const defaultDeps = [
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000000000000000000000000000002"
    ];
    const allDeps = [...new Set([...defaultDeps, ...normalizedDeps])];

    // load network and signer from environment
    const { network, client, tx, signer } = await setupSuiTransaction();
    const sender = signer.toSuiAddress();
    console.log("Active network:", network);
    console.log("Active address:", sender);

    // publish package
    console.log("Building transaction...");
    const [upgradeCap] = tx.publish({
        modules: bytecodes,
        dependencies: allDeps,
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
