import { BulksenderCommand } from './commands/bulksender/bulksender.js';
import { FindCoinBalancesCommand } from './commands/find-coin-balances.js';
import { FindCoinHoldersCommand } from './commands/find-coin-holders.js';
import { FindLastTransactionCommand } from './commands/find-last-txn.js';
import { FindNftHoldersCommand } from './commands/find-nft-holders.js';
import { FindNftsCommand } from './commands/find-nfts.js';
import { GenerateAddressesAndBalancesCommand } from './commands/generate-addresses-and-balances.js';
import { TestRpcEndpointsCommand } from './commands/test-rpc-endpoints.js';
import { TransformBalancesJsonToCsvCommand } from './commands/transform-balances-json-to-csv.js';

/**
 * Interface defining the structure of a command in the Commando framework.
 */
export type Command = {
    /** Returns a short description of the command. */
    getDescription(): string;
    /** Returns detailed usage information for the command. */
    getUsage(): string;
    /** Executes the command logic. */
    execute(args: string[]): Promise<void>;
}

/**
 * The main class responsible for managing and executing commands.
 */
export class Commando {
    private commands: Record<string, Command>;

    constructor() {
        this.commands = {};
        this.registerCommand('bulksender', new BulksenderCommand());
        this.registerCommand('find-coin-balances', new FindCoinBalancesCommand());
        this.registerCommand('find-coin-holders', new FindCoinHoldersCommand());
        this.registerCommand('find-last-txn', new FindLastTransactionCommand());
        this.registerCommand('find-nft-holders', new FindNftHoldersCommand());
        this.registerCommand('find-nfts', new FindNftsCommand());
        this.registerCommand('generate-addresses-and-balances', new GenerateAddressesAndBalancesCommand());
        this.registerCommand('test-rpc-endpoints', new TestRpcEndpointsCommand());
        this.registerCommand('transform-balances-json-to-csv', new TransformBalancesJsonToCsvCommand());
    }

    /**
     * Registers a new command with the Commando framework.
     * @param name - The name of the command.
     * @param command - The command object.
     */
    public registerCommand(name: string, command: Command) {
        this.commands[name] = command;
    }

    async run(): Promise<void> {
        const args = process.argv.slice(3); // skip 'pnpm' and 'commando'
        const commandName = process.argv[2];

        // Show general help
        if (!commandName || commandName === '-h' || commandName === '--help') {
            this.printGeneralHelp();
            return;
        }

        // Grab the requested command object
        const command = this.commands[commandName];
        if (!command) {
            console.error(`Unknown command: ${commandName}`);
            this.printGeneralHelp();
            process.exit(1);
        }

        // Show command usage
        if (args.includes('-h') || args.includes('--help')) {
            console.log(command.getUsage());
            return;
        }

        try {
            await command.execute(args);
        } catch (error) {
            console.error(`Error executing ${commandName}:`, error);
            process.exit(1);
        }
    }

    private printGeneralHelp(): void {
        console.log('POLYMEDIA COMMANDO');
        console.log('  Sui command line tools and TypeScript utilities.');
        console.log('\nUsage:');
        console.log('  pnpm commando COMMAND [OPTIONS]\n');

        console.log('Available Commands:');
        for (const commandName in this.commands) {
            const command = this.commands[commandName];
            console.log(`  - ${commandName}: ${command.getDescription()}`);
        }

        console.log('\nFor more information about a command:');
        console.log('  pnpm commando COMMAND -h');
    }

}
