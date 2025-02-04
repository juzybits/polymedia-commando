import fs from "fs";
import path from "path";

import { validateAndNormalizeAddress } from "@polymedia/suitcase-core";
import { setupSuiTransaction, signAndExecuteTx } from "@polymedia/suitcase-node";

import { log, debug, error } from "../logger.js";

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

    // load network and signer from environment
    const { network, client, tx, signer } = await setupSuiTransaction();
    const sender = signer.toSuiAddress();
    log("Active network", network);
    log("Active address", sender);

    // read bytecode files
    log("Reading bytecode files...");
    const bytecodes: number[][] = [];
    for (const file of bytecodeFiles) {
        debug(`- ${path.basename(file)}`);
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
    debug("Dependencies", allDeps);

    // publish package
    debug("Building transaction...");
    const [upgradeCap] = tx.publish({
        modules: bytecodes,
        dependencies: allDeps,
    });
    tx.transferObjects([upgradeCap], sender);

    log("Publishing package...");
    const resp = await signAndExecuteTx({ client, tx, signer, txRespOptions: { showEffects: true } });

    if (resp.effects?.status.status !== "success") {
        error("Publish failed. Response", resp);
        throw new Error("Publish failed");
    }

    debug("Publish successful. Response", resp);
    log("status", resp.effects?.status.status);
    log("digest", resp.digest);
}
