import { formatNumber, getCoinOfValue } from "@polymedia/suits";
import { Command } from "../Commando.js";
import { executeSuiTransaction, setupSuiTransaction } from "../utils-sui.js";
import { promptUser } from "../utils-misc.js";

export class SendCoinAmountCommand implements Command {
    private amount = 0;
    private coinType = "";
    private recipient = "";

    public getDescription(): string {
        return "Send an amount of Coin<T> to a recipient (handles coin merging and splitting)";
    }

    public getUsage(): string {
        return `${this.getDescription()}

Usage:
  send-coin AMOUNT COIN_TYPE RECIPIENT

Arguments:
  AMOUNT        The amount of to send, without decimals
  COIN_TYPE     The type of the coin (the T in Coin<T>)
  RECIPIENT     The address of the recipient

Example:
  send-coin 5000 0x123::lol::LOL 0x777
`;
    }

    public async execute(args: string[]): Promise<void>
    {
        /* Read command arguments */

        if (args.length !== 3) {
            console.log(this.getUsage());
            return;
        }
        this.amount = Number(args[0]);
        this.coinType = args[1];
        this.recipient = args[2];

        /* Calculate amount with decimals */

        const { suiClient, txb, signer } = setupSuiTransaction();
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
            txb,
            ownerAddress,
            this.coinType,
            amountWithDecimals,
        );
        txb.transferObjects([coin], txb.pure(this.recipient));

        const resp = await executeSuiTransaction(suiClient, txb, signer);
        console.log(resp);
    }
}
