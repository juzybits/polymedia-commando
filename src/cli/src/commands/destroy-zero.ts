import { DevInspectResults, PaginatedObjectsResponse, SuiClient, SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Signer } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";

import { objResToFields } from "@polymedia/suitcase-core";
import { setupSuiTransaction, signAndExecuteTx } from "@polymedia/suitcase-node";

import { debug, log } from "../logger.js";

// "Size limit exceeded: serialized transaction size exceeded maximum of 131072 is ..."
// see `max_tx_size_bytes` in sui/crates/sui-protocol-config/src/lib.rs
const MAX_CALLS_PER_TX = 750;

export async function destroyZero(
    devInspect: boolean,
): Promise<void>
{
    const { signer, client } = await setupSuiTransaction();
    let totalGas = 0;

    async function processBatch(
        coins: {
            objectId: string,
            innerType: string,
        }[],
        batchLabel: string,
    )
    {
        const tx = new Transaction();
        for (const coin of coins) {
            tx.moveCall({
                target: "0x2::coin::destroy_zero",
                typeArguments: [coin.innerType],
                arguments: [tx.object(coin.objectId)],
            });
        }
        log(`${batchLabel}: destroying ${coins.length} coins`);
        const resp = await executeTransaction(tx, client, signer, devInspect);

        if (!devInspect && resp.effects?.gasUsed) {
            const gas = resp.effects.gasUsed;
            totalGas += Number(gas.computationCost) + Number(gas.storageCost) - Number(gas.storageRebate);
        }
    }

    let pagObjRes: PaginatedObjectsResponse;
    let cursor: null | string = null;
    let currentBatch: { objectId: string, innerType: string }[] = [];

    do {
        pagObjRes = await client.getOwnedObjects({
            owner: signer.toSuiAddress(),
            filter: { StructType: "0x2::coin::Coin" },
            options: { showType: true, showContent: true },
            cursor,
        });
        cursor = pagObjRes.nextCursor ?? null;

        for (const objResp of pagObjRes.data) {
            const objFields = objResToFields(objResp);
            const objData = objResp.data!;
            const fullType = objData.type!;
            const innerType = (/<(.+)>/.exec(fullType))?.[1];
            if (!innerType) {
                throw new Error(`Can't parse coin type: ${fullType}`);
            }
            if (objFields.balance !== "0") {
                continue;
            }

            currentBatch.push({
                objectId: objData.objectId,
                innerType,
            });

            // process batch when it reaches max size
            if (currentBatch.length >= MAX_CALLS_PER_TX) {
                await processBatch(currentBatch, `batch of ${currentBatch.length}`);
                currentBatch = [];
            }
        }
    } while (pagObjRes.hasNextPage);

    // process any remaining coins in the final batch
    if (currentBatch.length > 0) {
        await processBatch(currentBatch, "final batch");
    }

    if (!devInspect) {
        log(`Gas used: ${totalGas / 1_000_000_000} SUI`);
    }
}

async function executeTransaction(
    tx: Transaction,
    client: SuiClient,
    signer: Signer,
    devInspect: boolean,
): Promise<DevInspectResults | SuiTransactionBlockResponse>
{
    let resp: DevInspectResults | SuiTransactionBlockResponse;

    if (devInspect) {
        resp = await client.devInspectTransactionBlock({
            transactionBlock: tx,
            sender: signer.toSuiAddress(),
        });
    } else {
        resp = await signAndExecuteTx({ client, tx, signer });
    }

    const info = {
        digest: "",
        status: resp.effects?.status.status,
        gasUsed: resp.effects?.gasUsed,
        deleted: resp.effects?.deleted?.map(obj => obj.objectId)
    };
    if ("digest" in resp) {
        info.digest = resp.digest;
    }
    debug("tx response", info);

    if (resp.effects?.status.status !== "success") {
        throw new Error("Transaction failed");
    }

    return resp;
}
