import { shortenSuiAddress } from '@polymedia/suits';
import { Command } from '../Commando.js';
import { setupSuiTransaction } from '../utils-sui.js';

export class GetBalanceCommand implements Command {
    private coinType = '';
    private addresses: string[] = [];

    public getDescription(): string {
        return 'Get the total Coin<T> balance owned by one or more addresses.';
    }

    public getUsage(): string {
        return `${this.getDescription()}

Usage:
  get-balance COIN_TYPE ADDRESS [ADDRESS...]

Arguments:
  COIN_TYPE     The type of the coin (the T in Coin<T>)
  ADDRESS       The Sui address or addresses to query the balance for

Example:
  get-balance 0x123::lol::LOL 0x777 0x888
`;
    }

    public async execute(args: string[]): Promise<void>
    {
        /* Read command arguments */

        if (args.length < 2) {
            console.log(this.getUsage());
            return;
        }
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
            const addressPretty = shortenSuiAddress(owner);
            const balancePretty = (Number(resp.totalBalance) / 10**coinMeta.decimals).toLocaleString('en-US');
            console.log(`${addressPretty}: ${balancePretty} ${coinMeta.symbol}`);
        }
    }
}
