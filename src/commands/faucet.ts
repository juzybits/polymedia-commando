import { getActiveAddress, getActiveEnv } from "@polymedia/suitcase-node";
import { Command } from "../Zui.js";
import { requestSuiFromFaucet, shortenSuiAddress, validateAndNormalizeSuiAddress } from "@polymedia/suitcase-core";

export class FaucetCommand implements Command {
    private recipients: string[] = [];

    public getDescription(): string {
        return "Get SUI from the faucet on localnet/devnet/testnet";
    }

    public getUsage(): string {
        return `${this.getDescription()}

Usage:
  faucet [RECIPIENT...]

Arguments:
  RECIPIENT     One or more Sui addresses where SUI should be sent.
                If no addresses are provided, it defaults to "sui client active-address".

Example:
  faucet 0x777 0x888
`;
    }

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

        const recipientList = this.recipients.map(r => shortenSuiAddress(r)).join(", ");
        console.log(`Sending SUI on ${network} to ${recipientList}`);

        for (const recipient of this.recipients) {
            requestSuiFromFaucet(network, recipient);
        }

        return Promise.resolve();
    }
}
