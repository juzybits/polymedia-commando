import { PaginatedObjectsResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

import { objResToFields } from "@polymedia/suitcase-core";
import { setupSuiTransaction, signAndExecuteTx } from "@polymedia/suitcase-node";

import { debug, log } from "../logger.js";

// "Size limit exceeded: serialized transaction size exceeded maximum of 131072 is ..."
// see `max_tx_size_bytes` in sui/crates/sui-protocol-config/src/lib.rs
const MAX_CALLS_PER_TX = 750;

type CoinInfo = {
    objectId: string;
    innerType: string;
};

export async function coinZeroDestroy(): Promise<void>
{
    log("Destroying all Coin with 0 balance in your wallet...");

    const { signer, client } = await setupSuiTransaction();
    let totalGas = 0;
    let batchNumber = 0;
    let totalBatches = 0;

    async function processBatch(coins: CoinInfo[])
    {
        batchNumber++;
        const tx = new Transaction();
        for (const coin of coins) {
            tx.moveCall({
                target: "0x2::coin::destroy_zero",
                typeArguments: [coin.innerType],
                arguments: [tx.object(coin.objectId)],
            });
        }
        log(`Sending tx ${batchNumber}/${totalBatches} with ${coins.length} coins...`);
        const resp = await signAndExecuteTx({ client, tx, signer });
        debug("tx response", resp);

        const gas = resp.effects!.gasUsed;
        totalGas += Number(gas.computationCost) + Number(gas.storageCost) - Number(gas.storageRebate);
    }

    let pagObjRes: PaginatedObjectsResponse;
    let cursor: null | string = null;
    let currentBatch: CoinInfo[] = [];
    const zeroCoins: CoinInfo[] = [];

    // First collect all zero coins
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
            zeroCoins.push({
                objectId: objData.objectId,
                innerType,
            });
        }
    } while (pagObjRes.hasNextPage);

    // Calculate total batches
    totalBatches = Math.ceil(zeroCoins.length / MAX_CALLS_PER_TX);

    // Process coins in batches
    for (let i = 0; i < zeroCoins.length; i++) {
        currentBatch.push(zeroCoins[i]);

        if (currentBatch.length >= MAX_CALLS_PER_TX || i === zeroCoins.length - 1) {
            await processBatch(currentBatch);
            currentBatch = [];
        }
    }

    log(`Gas used: ${totalGas / 1_000_000_000} SUI`);
}
