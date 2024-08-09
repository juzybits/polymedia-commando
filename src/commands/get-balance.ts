import { shortenAddress } from "@polymedia/suitcase-core";
import { setupSuiTransaction } from "@polymedia/suitcase-node";
import { ZuiCommand } from "../types.js";

export class GetBalanceCommand implements ZuiCommand
{
    private coinType = "";
    private addresses: string[] = [];

    public async execute(args: string[]): Promise<void>
    {
        /* Read command arguments */

        [this.coinType, ...this.addresses] = args;

        /* Fetch CoinMetadata<T> */

        const { suiClient } = setupSuiTransaction();
        const coinMeta = await suiClient.getCoinMetadata({ coinType: this.coinType });
        if (!coinMeta) {
            console.error(`Error: CoinMetadata not found for ${this.coinType}`);
            return;
        }

        /* Fetch balances for each address */

        for (const owner of this.addresses) {
            const resp = await suiClient.getBalance({ owner, coinType: this.coinType });
            const addressPretty = shortenAddress(owner);
            const balancePretty = (Number(resp.totalBalance) / 10**coinMeta.decimals).toLocaleString("en-US");
            console.log(`${addressPretty}: ${balancePretty} ${coinMeta.symbol}`);
        }
    }
}
