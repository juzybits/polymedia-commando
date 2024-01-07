/* Miscellaneous utils */

import { createInterface } from 'readline';

/**
 * Wait for a number of milliseconds.
 */
export async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format a number into a readable string.
 */
export function formatNumber(num: number|BigInt): string {
    return num.toLocaleString('en-US');
}

/**
 * Split an array into multiple chunks of a certain size.
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        const chunk = array.slice(i, i + chunkSize);
        chunks.push(chunk);
    }
    return chunks;
}

/**
 * Display a query to the user and wait for command line input. Return true if the user inputs 'y'.
 */
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
 * Make a request to the Indexer.xyz API (NFTs).
 * To use this function, add your API credentials to `../.auth.ts`
 */
export async function apiRequestIndexer(apiUser: string, apiKey: string, query: any): Promise<any> {
    const result = await fetch('https://api.indexer.xyz/graphql', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'x-api-user': apiUser,
          'x-api-key': apiKey,
      },
      body: JSON.stringify({query}),
    })
    .then((response: Response) => {
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        return response.json();
    })
    .then((result: any) => {
        return result;
    });
    return result;
}
