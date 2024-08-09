import { PaginatedObjectsResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { executeSuiTransaction, setupSuiTransaction } from "@polymedia/suitcase-node";
import { ZuiCommand } from "../types.js";

const DEFAULT_RECIPIENT = "0xc67b4231d7f64be622d4534c590570fc2fdea1a70a7cbf72ddfeba16d11fd22e";

export class EmptyWalletCommand implements ZuiCommand
{
    public getDescription(): string {
        return "Send all objects in your wallet to a random address (except Coin<SUI>)";
    }

    public getUsage(): string {
        return `${this.getDescription()}

Usage:
  empty-wallet [RECIPIENT]

Arguments:
  RECIPIENT     The address where the objects will be sent. Defaults to a random address.

Example:
  empty-wallet 0xdead
`;
    }

    public async execute(args: string[]): Promise<void>
    {
        const { network, signer, suiClient } = setupSuiTransaction();

        /* Make sure we're not on mainnet */

        if (network === "mainnet") {
            console.error("You are on mainnet! Aborting.");
            return;
        }

        /* Read command arguments */

        const recipientAddr = args.length === 0 ? DEFAULT_RECIPIENT : args[0];

        /* Do the thing */

        let pagObjRes: PaginatedObjectsResponse;
        let cursor: null | string = null;
        let page = 0;
        do {
            pagObjRes = await suiClient.getOwnedObjects({
                owner: signer.toSuiAddress(),
                cursor,
                options: { showType: true },
            });
            cursor = pagObjRes.nextCursor ?? null;
            page++;
            if (pagObjRes.data.length > 0)
            {
                const objIds = pagObjRes.data
                    .filter(obj => obj.data?.type !== "0x2::coin::Coin<0x2::sui::SUI>")
                    .map(obj => obj.data!.objectId);
                if (objIds.length === 0) {
                    continue;
                }
                const tx = new Transaction();
                tx.transferObjects(objIds, recipientAddr);
                const txRes = await executeSuiTransaction(suiClient, tx, signer);
                console.log(`page: ${page}, objects: ${objIds.length}, tx status: ${txRes.effects!.status.status}`);
            }
        } while (pagObjRes.hasNextPage);

    }
}
