import fs from 'fs';

export function fileExists(filename: string): boolean {
    try {
        fs.accessSync(filename);
        return true;
    } catch (error) {
        return false;
    }
}

export function writeTextFile(filename: string, contents: string): void {
    fs.writeFileSync(
        filename,
        contents + '\n'
    );
}

/**
 * A basic CSV writer.
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

export function readJsonFile(filename: string): any {
    const fileContent = fs.readFileSync(filename, 'utf8');
    const jsonData = JSON.parse(fileContent);
    return jsonData;
}

export function writeJsonFile(filename: string, contents: any): void {
    writeTextFile(
        filename,
        JSON.stringify(contents, null, 4)
    );
}
