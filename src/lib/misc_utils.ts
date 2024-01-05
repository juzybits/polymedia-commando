/* Miscellaneous utils */

import { createInterface } from 'readline';

export async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function formatNumber(num: number|BigInt): string {
    return num.toLocaleString('en-US');
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        const chunk = array.slice(i, i + chunkSize);
        chunks.push(chunk);
    }
    return chunks;
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
