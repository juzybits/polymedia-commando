/* Miscellaneous utils */

import crypto from 'crypto';
import { createInterface } from "readline";

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        const chunk = array.slice(i, i + chunkSize);
        chunks.push(chunk);
    }
    return chunks;
}

export function formatNumber(num: number|BigInt): string {
    return num.toLocaleString('en-US');
}

export async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function promptUser(question: string): Promise<boolean> {
    return new Promise((resolve) => {
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y');
        });
    });
}

/**
 * Generate a random Sui address (for development only)
 */
export function getRandomAddress(): string {
    const randomBytes = crypto.randomBytes(32);
    const address = '0x' + randomBytes.toString('hex');
    return address;
}
