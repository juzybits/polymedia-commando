import { execSync } from 'child_process';
import crypto from 'crypto';
import { accessSync, readFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { createInterface } from 'readline';

import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64, isValidSuiAddress, normalizeSuiAddress } from '@mysten/sui.js/utils';
import { excludedOwners } from './config.js';

export type AddressAmountPair = {
    address: string;
    amount: bigint;
}

/* File utils */

/**
 * A basic CSV parser designed to read the output of holderfinder/src/aggregateNfts.ts.
 *
 * It expects the 1st column to be the owner address and the 2nd column to be the amount to be sent.
 *
 * Note that this is not a generic CSV parsing solution and it will break if the input
 * CSV data contains commas or newlines.
 */
export function readCsvInputFile(filename: string): AddressAmountPair[] {
    const fileContent = readFileSync(filename, 'utf8');
    const lines = fileContent.split('\n');
    const results: AddressAmountPair[] = [];

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
            continue;
        }
        // Split the line by commas and remove quotes from each value
        const [addressStr, amountStr] = trimmedLine.split(',').map(value =>
            value.replace(/^"|"$/g, '').replace(/\\"/g, '"').trim()
        );
        if (!addressStr.startsWith('0x')) {
            console.debug(`[readCsvInputFile] Skipping line with missing owner: ${trimmedLine.substring(0, 70)}`);
            continue;
        }
        const address = normalizeSuiAddress(addressStr);
        if (!isValidSuiAddress(address)) {
            console.debug(`[readCsvInputFile] Skipping line with invalid owner: ${trimmedLine.substring(0, 70)}`);
            continue;
        }
        if (excludedOwners.includes(address)) {
            console.debug(`[readCsvInputFile] Skipping excluded owner: ${address}`);
            continue;
        }
        results.push({ address, amount: BigInt(amountStr) });
    }

    return results;
}

export function fileExists(filename: string): boolean {
    try {
        accessSync(filename);
        return true;
    } catch (error) {
        return false;
    }
}

/* Sui utils */

/**
 * Build a Ed25519Keypair object for the current active address,
 * by loading the secret key from ~/.sui/sui_config/sui.keystore
 */
export function getActiveAddressKeypair(): Ed25519Keypair {
    const sender = execSync('sui client active-address', { encoding: 'utf8' }).trim();

    const signer = (() => {
        const fileContent = readFileSync(
            path.join(homedir(), '.sui', 'sui_config', 'sui.keystore'),
            'utf8'
        );
        const keystore = JSON.parse(fileContent);

        for (const priv of keystore) {
            const raw = fromB64(priv);
            if (raw[0] !== 0) {
                continue;
            }

            const pair = Ed25519Keypair.fromSecretKey(raw.slice(1));
            if (pair.getPublicKey().toSuiAddress() === sender) {
                return pair;
            }
        }

        throw new Error(`keypair not found for sender: ${sender}`);
    })();

    return signer;
}

export function getActiveEnv():  'mainnet' | 'testnet' | 'devnet' | 'localnet' {
    const activeEnv = execSync('sui client active-env', { encoding: 'utf8' }).trim();
    return activeEnv as 'mainnet' | 'testnet' | 'devnet' | 'localnet';
}

/* Miscellaneous utils */

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
