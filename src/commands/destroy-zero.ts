import { DevInspectResults, PaginatedObjectsResponse, SuiClient, SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Signer } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";

import { objResToFields } from "@polymedia/suitcase-core";
import { setupSuiTransaction } from "@polymedia/suitcase-node";

const MAX_CALLS_PER_TX = 1000; // see `max_programmable_tx_commands` in sui/crates/sui-protocol-config/src/lib.rs

export async function destroyZero(
    devInspect: boolean,
): Promise<void>
{
    const { signer, suiClient } = await setupSuiTransaction();

    let pagObjRes: PaginatedObjectsResponse;
    let cursor: null | string = null;

    let tx = new Transaction();
    let txNumber = 1;
    let moveCallCount = 0; // do up to MAX_CALLS_PER_TX coin::destroy_zero() calls per tx

    do {
        pagObjRes = await suiClient.getOwnedObjects({
            owner: signer.toSuiAddress(),
            filter: { StructType: "0x2::coin::Coin" },
            options: { showType: true, showContent: true },
            cursor,
        });
        cursor = pagObjRes.nextCursor ?? null;

        for (const objResp of pagObjRes.data)
        {
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
            tx.moveCall({
                target: "0x2::coin::destroy_zero",
                typeArguments: [innerType],
                arguments: [tx.object(objData.objectId)],
            });

            moveCallCount++;
            if (moveCallCount >= MAX_CALLS_PER_TX) {
                console.log(`=== tx ${txNumber++}: Destroying ${moveCallCount} coins ===`);
                await executeTransaction(tx, suiClient, signer, devInspect);
                tx = new Transaction();
                txNumber++;
                moveCallCount = 0;
            }
        }
    } while (pagObjRes.hasNextPage);

    if (moveCallCount > 0) {
        console.log(`=== tx ${txNumber++}: Destroying ${moveCallCount} coins ===`);
        await executeTransaction(tx, suiClient, signer, devInspect);
    }
}

async function executeTransaction(
    tx: Transaction,
    suiClient: SuiClient,
    signer: Signer,
    devInspect: boolean,
): Promise<void>
{
    let resp: DevInspectResults | SuiTransactionBlockResponse;

    if (devInspect) {
        resp = await suiClient.devInspectTransactionBlock({
            transactionBlock: tx,
            sender: signer.toSuiAddress(),
        });
    } else {
        resp = await suiClient.signAndExecuteTransaction({
            signer,
            transaction: tx,
            options: { showEffects: true, showObjectChanges: true }
        });
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
    console.log(JSON.stringify(info, null, 2));

    if (resp.effects?.status.status !== "success") {
        throw new Error("Transaction failed");
    }
}
