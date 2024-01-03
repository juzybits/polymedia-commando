import { FindCoinBalancesCommand } from './commands/find_coin_balances.js';
import { FindCoinHoldersCommand } from './commands/find_coin_holders.js';
import { FindLastTransactionCommand } from './commands/find_last_txn.js';
import { GenerateRandomAddressesAndBalancesCommand } from './commands/generate_random_addresses_and_balances.js';
import { TestRpcEndpointsCommand } from './commands/test_rpc_endpoints.js';
import { TransformBalancesJsonToCsvCommand } from './commands/transform_balances_json_to_csv.js';

/**
 * Interface defining the structure of a command in the Commando framework.
 */
export interface Command {
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
        this.registerCommand('find_coin_balances', new FindCoinBalancesCommand());
        this.registerCommand('find_coin_holders', new FindCoinHoldersCommand());
        this.registerCommand('find_last_txn', new FindLastTransactionCommand());
        this.registerCommand('test_rpc_endpoints', new TestRpcEndpointsCommand());
        this.registerCommand('transform_balances_json_to_csv', new TransformBalancesJsonToCsvCommand());
        this.registerCommand('generate_random_addresses_and_balances', new GenerateRandomAddressesAndBalancesCommand());
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
        console.log('*** POLYMEDIA COMMANDO ***');
        console.log('\nUsage:');
        console.log('  pnpm commando [command] [options]\n');

        console.log('Available Commands:');
        for (const commandName in this.commands) {
            const command = this.commands[commandName];
            console.log(`  - ${commandName}: ${command.getDescription()}`);
        }

        console.log('\nFor more information on a specific command, type:');
        console.log('  commando [command] -h');
    }

}
