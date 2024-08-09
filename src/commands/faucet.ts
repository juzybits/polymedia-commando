import { getActiveAddress, getActiveEnv } from "@polymedia/suitcase-node";
import { ZuiCommand } from "../types.js";
import { requestSuiFromFaucet, shortenAddress, validateAndNormalizeSuiAddress } from "@polymedia/suitcase-core";

export class FaucetCommand implements ZuiCommand
{
    private recipients: string[] = [];

    public async execute(args: string[]): Promise<void>
    {
        /* Read command arguments */

        for (const recipient of args) {
            const cleanRecipient = validateAndNormalizeSuiAddress(recipient);
            if (!cleanRecipient) {
                console.warn(`Error: invalid address: ${recipient}`);
                return;
            }
            this.recipients.push(cleanRecipient);
        }

        if (this.recipients.length === 0) {
            const activeAddress = getActiveAddress();
            this.recipients.push(activeAddress);
        }

        const network = getActiveEnv();
        if (network !== "localnet" && network !== "devnet" && network !== "testnet") {
            console.warn(`Error: can't use faucet on ${network}`);
            return;
        }

        /* Use the faucet */

        const recipientList = this.recipients.map(r => shortenAddress(r)).join(", ");
        console.log(`Sending SUI on ${network} to ${recipientList}`);

        for (const recipient of this.recipients) {
            requestSuiFromFaucet(network, recipient);
        }

        return Promise.resolve();
    }
}
