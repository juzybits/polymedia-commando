import { SuiClientRotator } from './common/sui_utils.js';

const USAGE = `
Call SuiRotator.testEndpoints()

Usage: pnpm test_endpoints
`;

function printUsage() {
    console.log(USAGE);
}

async function main()
{
    /* Read and validate inputs */

    const args = process.argv.slice(2);

    if (args.includes('-h') || args.includes('--help')) {
        printUsage();
        return;
    }

    /* Call SuiRotator.testEndpoints() */

    const rotator = new SuiClientRotator();
    rotator.testEndpoints();
}

main();

export {};
