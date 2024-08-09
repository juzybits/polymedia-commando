import { shortenAddress } from "@polymedia/suitcase-core";
import { setupSuiTransaction } from "@polymedia/suitcase-node";

export async function balance(
    coinType: string,
    addresses: string[],
): Promise<void>
{
    /* Fetch CoinMetadata<T> */

    const { suiClient } = setupSuiTransaction();
    const coinMeta = await suiClient.getCoinMetadata({ coinType: coinType });
    if (!coinMeta) {
        console.error(`Error: CoinMetadata not found for ${coinType}`);
        return;
    }

    /* Fetch balances for each address */

    for (const owner of addresses) {
        const resp = await suiClient.getBalance({ owner, coinType: coinType });
        const addressPretty = shortenAddress(owner);
        const balancePretty = (Number(resp.totalBalance) / 10**coinMeta.decimals).toLocaleString("en-US");
        console.log(`${addressPretty}: ${balancePretty} ${coinMeta.symbol}`);
    }
}
