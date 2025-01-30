
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";

export async function msgVerify({
    message, address, signature,
}:{
    message: string;
    address: string;
    signature: string;
}): Promise<void>
{
    try {
        await verifyPersonalMessageSignature(
            new TextEncoder().encode(message),
            signature,
            { address },
        );
        console.log(JSON.stringify({
            success: true,
        }));
        process.exit(0);
    } catch (error) {
        console.error(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
        }));
        process.exit(1);
    }
}
