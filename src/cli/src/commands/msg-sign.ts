import { getActiveKeypair } from "@polymedia/suitcase-node";

export async function msgSign(
    message: string,
): Promise<void>
{
    try {
        const signer = await getActiveKeypair();
        const signature = await signer.signPersonalMessage(
            new TextEncoder().encode(message)
        );
        console.log(JSON.stringify({
            signature: signature.signature,
        }));
        process.exit(0);
    } catch (error) {
        console.error(JSON.stringify({
            signature: null,
            error: error instanceof Error ? error.message : String(error),
        }));
        process.exit(1);
    }
}
