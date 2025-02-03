import fs from "fs";

import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

import { pairFromSecretKey } from "@polymedia/suitcase-core";

const moduleBytecodes = [ // TODO read from arguments
    "./out/collection.mv",
    "./out/nft.mv",
];

export async function bytecodePublish({
}:{
}): Promise<void>
{
    const privateKey = "suiprivkey1qz58vz6dtqtx8v5yu7kg95v5k3zdlsh28txk38lztaxh89rnkp492vrw7f7";
    const keypair = pairFromSecretKey(privateKey);
    const sender = keypair.toSuiAddress();
    console.log("Sender address:", sender); // 0x07cc17b06662371b306cd6a84bd20134f8d7c230cb8b7c6fc3eb6da08d26d6d2

    console.log("Reading bytecodes...");
    const bytecodes: any[] = [];
    for (const moduleBytecode of moduleBytecodes) {
        const bytecode = fs.readFileSync(moduleBytecode);
        bytecodes.push(Array.from(bytecode));
    }

    console.log("Building transaction...");
    const tx = new Transaction();
    const [upgradeCap] = tx.publish({
        modules: bytecodes,
        dependencies: [ "0x1", "0x2" ],
    });
    tx.transferObjects([upgradeCap], sender);

    console.log("Publishing package...");
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

    console.log("Published! Result:", result);
}
