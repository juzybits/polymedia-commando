import { getActiveAddress, getActiveEnv } from "@polymedia/suitcase-node";
import { requestSuiFromFaucet, shortenAddress, validateAndNormalizeSuiAddress } from "@polymedia/suitcase-core";

export async function faucet(
    addresses: string[],
): Promise<void>
{
    // === gather recipient addresses ===

    const recipients: string[] = [];

    for (const recipient of addresses) {
        const cleanRecipient = validateAndNormalizeSuiAddress(recipient);
        if (!cleanRecipient) {
            console.warn(`Error: invalid address: ${recipient}`);
            return;
        }
        recipients.push(cleanRecipient);
    }

    if (recipients.length === 0) {
        const activeAddress = getActiveAddress();
        recipients.push(activeAddress);
    }

    const network = getActiveEnv();
    if (network !== "localnet" && network !== "devnet" && network !== "testnet") {
        console.warn(`Error: can't use faucet on ${network}`);
        return;
    }

    // === use the faucet ===

    const recipientList = recipients.map(r => shortenAddress(r)).join(", ");
    console.log(`Sending SUI on ${network} to ${recipientList}`);

    for (const recipient of recipients) {
        requestSuiFromFaucet(network, recipient);
    }

    return Promise.resolve();
}
