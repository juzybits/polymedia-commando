import { PaginatedObjectsResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

import { isParsedDataKind, objResToContent, objResToType } from "@polymedia/suitcase-core";
import { signAndExecuteTx, setupSuiTransaction } from "@polymedia/suitcase-node";
import { log } from "../logger.js";

const DEFAULT_RECIPIENT = "0xc67b4231d7f64be622d4534c590570fc2fdea1a70a7cbf72ddfeba16d11fd22e";

export async function emptyWallet(
    recipient?: string,
): Promise<void>
{
    log("Emptying wallet...");

    const { network, signer, client } = await setupSuiTransaction();

    if (network === "mainnet") {
        throw new Error("You are on mainnet! Aborting.");
    }

    const recipientAddr = recipient ?? DEFAULT_RECIPIENT;

    let pagObjRes: PaginatedObjectsResponse;
    let cursor: null | string = null;
    let page = 0;
    do {
        pagObjRes = await client.getOwnedObjects({
            owner: signer.toSuiAddress(),
            cursor,
            options: { showType: true, showContent: true },
        });
        cursor = pagObjRes.nextCursor ?? null;
        page++;
        if (pagObjRes.data.length > 0)
        {
            const objIds = pagObjRes.data
                .filter(obj => {
                    const content = objResToContent(obj);
                    return isParsedDataKind(content, "moveObject")
                        && content.hasPublicTransfer
                        && objResToType(obj) !== "0x2::coin::Coin<0x2::sui::SUI>";
                })
                .map(obj => obj.data!.objectId);
            if (objIds.length === 0) {
                continue;
            }
            const tx = new Transaction();
            tx.transferObjects(objIds, recipientAddr);
            const txRes = await signAndExecuteTx({ client, tx, signer });
            log(`page: ${page}, objects: ${objIds.length}, tx status: ${txRes.effects?.status.status}, tx digest: ${txRes.digest}`);
        }
    } while (pagObjRes.hasNextPage);
}
