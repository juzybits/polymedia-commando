import { PaginatedObjectsResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

import { isParsedDataKind, objResToContent, objResToType, validateAndNormalizeAddress } from "@polymedia/suitcase-core";
import { signAndExecuteTx, setupSuiTransaction, promptUser } from "@polymedia/suitcase-node";

import { log, error } from "../logger.js";

export async function emptyWallet({
    recipient,
}: {
    recipient: string,
}): Promise<void>
{
    const recipientAddr = validateAndNormalizeAddress(recipient);
    if (!recipientAddr) {
        error("Invalid address", recipient);
        process.exit(1);
    }

    log("Sending all objects to", recipientAddr);

    const { network, signer, client } = await setupSuiTransaction();

    const userConfirmed = network !== "mainnet" || await promptUser("You are on mainnet! Continue? (y/n) ");
    if (!userConfirmed) {
        log("Execution aborted by the user");
        return;
    }

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
