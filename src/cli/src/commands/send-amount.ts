import { coinWithBalance } from "@mysten/sui/transactions";

import { formatBalance, formatNumber, stringToBalance } from "@polymedia/suitcase-core";
import { signAndExecuteTx, promptUser, setupSuiTransaction } from "@polymedia/suitcase-node";

import { error, log, debug } from "../logger.js";

export async function sendAmount({
    amount, coinType, recipient,
}: {
    amount: string;
    coinType: string;
    recipient: string;
}): Promise<void>
{
    /* Calculate amount with decimals */

    const { client, tx, signer, network } = await setupSuiTransaction();
    const coinMeta = await client.getCoinMetadata({coinType: coinType});
    if (!coinMeta) {
        error(`CoinMetadata not found for ${coinType}`);
        return;
    }
    const balanceToSend = stringToBalance(amount, coinMeta.decimals);

    /* Check if the user has enough balance */

    const ownerAddress = signer.getPublicKey().toSuiAddress();
    const balanceObj = await client.getBalance({
        owner: ownerAddress,
        coinType: coinType,
    });
    const userBalance = BigInt(balanceObj.totalBalance);
    if (userBalance < balanceToSend) {
        const balance = Number(userBalance) / 10**coinMeta.decimals;
        error(`your balance is only ${formatNumber(balance)} ${coinMeta.symbol}`);
        return;
    }

    /* Get user confirmation */

    log("amount", `${formatBalance(balanceToSend, coinMeta.decimals)} ${coinMeta.symbol}`);
    log("recipient", recipient);
    const userConfirmed = network !== "mainnet" || await promptUser("\nDoes this look okay? (y/n) ");
    if (!userConfirmed) {
        log("Execution aborted by the user");
        return;
    }

    /* Send the coin */

    const coin = coinWithBalance({
        balance: balanceToSend,
        type: coinType,
    })(tx);
    tx.transferObjects([coin], recipient);

    const resp = await signAndExecuteTx({ client, tx, signer, waitForTxOptions: false });
    debug("Response", resp);
    log("tx status", resp.effects?.status.status);
    log("tx digest", resp.digest);
}
