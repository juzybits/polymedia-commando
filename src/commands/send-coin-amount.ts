import { formatNumber, getCoinOfValue } from "@polymedia/suitcase-core";
import { executeSuiTransaction, promptUser, setupSuiTransaction } from "@polymedia/suitcase-node";

export class SendCoinAmountCommand
{
    private amount = 0;
    private coinType = "";
    private recipient = "";

    public async execute(args: string[]): Promise<void>
    {
        /* Read command arguments */

        this.amount = Number(args[0]);
        this.coinType = args[1];
        this.recipient = args[2];

        /* Calculate amount with decimals */

        const { suiClient, tx, signer } = setupSuiTransaction();
        const coinMeta = await suiClient.getCoinMetadata({coinType: this.coinType});
        if (!coinMeta) {
            console.error(`Error: CoinMetadata not found for ${this.coinType}`);
            return;
        }
        const amountWithDecimals = BigInt(this.amount * 10**coinMeta.decimals);

        /* Check if the user has enough balance */

        const ownerAddress = signer.getPublicKey().toSuiAddress();
        const balanceObj = await suiClient.getBalance({
            owner: ownerAddress,
            coinType: this.coinType,
        });
        const balanceWithDecimals = BigInt(balanceObj.totalBalance);
        if (balanceWithDecimals < amountWithDecimals) {
            const balance = Number(balanceWithDecimals) / 10**coinMeta.decimals;
            console.error(`Error: your balance is only ${formatNumber(balance)} ${coinMeta.symbol}`);
            return;
        }

        /* Get user confirmation */

        console.log(`amount: ${formatNumber(this.amount)} ${coinMeta.symbol}`);
        console.log(`recipient: ${this.recipient}`);
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
            this.coinType,
            amountWithDecimals,
        );
        tx.transferObjects([coin], this.recipient);

        const resp = await executeSuiTransaction(suiClient, tx, signer);
        console.log(resp);
    }
}
