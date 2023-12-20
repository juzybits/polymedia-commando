import fs from 'fs';
import * as Auth from './.auth.js';
import * as Config from './config.js';

export async function apiRequest(query: any): Promise<any> {
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

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function makeFilePath(filename: string): string {
    return Config.outDir + '/' + filename;
}

export function writeTextFile(filename: string, contents: string): void {
    fs.writeFileSync(
        makeFilePath(filename),
        contents + '\n'
    );
}

export function writeJsonFile(filename: string, contents: any): void {
    writeTextFile(
        filename,
        JSON.stringify(contents, null, 4)
    );
}

export function readJsonFile(filename: string): any {
    const fileContent = fs.readFileSync(makeFilePath(filename), 'utf8');
    const jsonData = JSON.parse(fileContent);
    return jsonData;
}

/**
 * A basic CSV writer whose output is meant to be read by bulksender-js/src/bulksender.ts.
 *
 * Note that this is not a generic CSV writing solution and it will break if the input
 * CSV data contains commas or newlines.
 */
export function writeCsvFile(filename: string, data: any[][]): void {
    const csvRows = data.map(row => {
        return row.map(value => {
            const escapedValue = ('' + value).replace(/"/g, '\\"');
            return `"${escapedValue}"`;
        }).join(',');
    });

    writeTextFile(
        filename,
        csvRows.join('\n')
    );
}
