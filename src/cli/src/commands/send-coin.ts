import { coinWithBalance } from "@mysten/sui/transactions";

import { formatBalance, formatNumber, stringToBalance } from "@polymedia/suitcase-core";
import { executeSuiTransaction, promptUser, setupSuiTransaction } from "@polymedia/suitcase-node";

export async function sendCoin(
    amount: string,
    coinType: string,
    recipientAddr: string,
): Promise<void>
{
    /* Calculate amount with decimals */

    const { suiClient, tx, signer } = await setupSuiTransaction();
    const coinMeta = await suiClient.getCoinMetadata({coinType: coinType});
    if (!coinMeta) {
        console.error(`Error: CoinMetadata not found for ${coinType}`);
        return;
    }
    const balanceToSend = stringToBalance(amount, coinMeta.decimals);

    /* Check if the user has enough balance */

    const ownerAddress = signer.getPublicKey().toSuiAddress();
    const balanceObj = await suiClient.getBalance({
        owner: ownerAddress,
        coinType: coinType,
    });
    const userBalance = BigInt(balanceObj.totalBalance);
    if (userBalance < balanceToSend) {
        const balance = Number(userBalance) / 10**coinMeta.decimals;
        console.error(`Error: your balance is only ${formatNumber(balance)} ${coinMeta.symbol}`);
        return;
    }

    /* Get user confirmation */

    console.log(`amount: ${formatBalance(balanceToSend, coinMeta.decimals)} ${coinMeta.symbol}`);
    console.log(`recipient: ${recipientAddr}`);
    const userConfirmed = await promptUser("\nDoes this look okay? (y/n) ");
    if (!userConfirmed) {
        console.log("Execution aborted by the user.");
        return;
    }

    /* Send the coin */

    const coin = coinWithBalance({
        balance: balanceToSend,
        type: coinType,
    })(tx);
    tx.transferObjects([coin], recipientAddr);

    const resp = await executeSuiTransaction(suiClient, tx, signer);
    console.log(resp);
}
