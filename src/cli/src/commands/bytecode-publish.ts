import fs from "fs";

import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

import { pairFromSecretKey } from "@polymedia/suitcase-core";

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

    const privateKey = "suiprivkey1qz58vz6dtqtx8v5yu7kg95v5k3zdlsh28txk38lztaxh89rnkp492vrw7f7";
    const keypair = pairFromSecretKey(privateKey);
    const sender = keypair.toSuiAddress();
    console.debug("Sender address:", sender); // // 0x07cc17b06662371b306cd6a84bd20134f8d7c230cb8b7c6fc3eb6da08d26d6d2

    console.debug("Reading bytecodes...");
    const bytecodes: number[][] = [];
    for (const file of bytecodeFiles) {
        const bytecode = fs.readFileSync(file);
        bytecodes.push(Array.from(bytecode));
    }

    console.debug("Building transaction...");
    const tx = new Transaction();
    const [upgradeCap] = tx.publish({
        modules: bytecodes,
        dependencies: [ "0x1", "0x2" ],
    });
    tx.transferObjects([upgradeCap], sender);

    console.debug("Publishing package...");
    const client = new SuiClient({
        url: getFullnodeUrl("localnet")
    });
    const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        options: {
            showEffects: true,
            showObjectChanges: true,
        }
    });

    if (result.effects?.status.status !== "success") {
        console.error(JSON.stringify(result.effects, null, 2));
        throw new Error("publish failed");
    }

    console.debug("Published! Result:", result);
}
