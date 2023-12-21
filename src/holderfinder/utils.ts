import * as Auth from './.auth.js';
import * as Config from './config.js';

export async function apiRequestIndexer(query: any): Promise<any> {
    const result = await fetch('https://api.indexer.xyz/graphql', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'x-api-user': Auth.INDEXER_API_USER,
          'x-api-key': Auth.INDEXER_API_KEY,
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

export function makeFilePath(filename: string): string {
    return Config.outDir + '/' + filename;
}
