import { formatNumber, getCoinOfValue } from "@polymedia/suitcase-core";
import { executeSuiTransaction, promptUser, setupSuiTransaction } from "@polymedia/suitcase-node";

export async function sendCoin(
    amount: number,
    coinType: string,
    recipient: string,
): Promise<void>
{
    /* Calculate amount with decimals */

    const { suiClient, tx, signer } = setupSuiTransaction();
    const coinMeta = await suiClient.getCoinMetadata({coinType: coinType});
    if (!coinMeta) {
        console.error(`Error: CoinMetadata not found for ${coinType}`);
        return;
    }
    const amountWithDecimals = BigInt(amount * 10**coinMeta.decimals);

    /* Check if the user has enough balance */

    const ownerAddress = signer.getPublicKey().toSuiAddress();
    const balanceObj = await suiClient.getBalance({
        owner: ownerAddress,
        coinType: coinType,
    });
    const balanceWithDecimals = BigInt(balanceObj.totalBalance);
    if (balanceWithDecimals < amountWithDecimals) {
        const balance = Number(balanceWithDecimals) / 10**coinMeta.decimals;
        console.error(`Error: your balance is only ${formatNumber(balance)} ${coinMeta.symbol}`);
        return;
    }

    /* Get user confirmation */

    console.log(`amount: ${formatNumber(amount)} ${coinMeta.symbol}`);
    console.log(`recipient: ${recipient}`);
    const userConfirmed = await promptUser("\nDoes this look okay? (y/n) ");
    if (!userConfirmed) {
        console.log("Execution aborted by the user.");
        return;
    }

    /* Send the coin */

    const [coin] = await getCoinOfValue(
        suiClient,
        tx,
        ownerAddress,
        coinType,
        amountWithDecimals,
    );
    tx.transferObjects([coin], recipient);

    const resp = await executeSuiTransaction(suiClient, tx, signer);
    console.log(resp);
}
