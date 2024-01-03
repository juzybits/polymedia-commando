import { BulksenderCommand } from './commands/bulksender/bulksender.js';
import { FindCoinBalancesCommand } from './commands/find_coin_balances.js';
import { FindCoinHoldersCommand } from './commands/find_coin_holders.js';
import { FindLastTxnCommand } from './commands/find_last_txn.js';
import { GenerateRandomAddressesAndBalancesCommand } from './commands/generate_random_addresses_and_balances.js';
import { TestRpcEndpointsCommand } from './commands/test_rpc_endpoints.js';
import { TransformBalancesJsonToCsvCommand } from './commands/transform_balances_json_to_csv.js';
import { CommandFactory } from './types.js';

export class Commando {
    private commandFactories: Record<string, CommandFactory>;

    constructor() {
        this.commandFactories = {};
        this.registerCommand('bulksender', args => new BulksenderCommand(args));
        this.registerCommand('find_coin_balances', args => new FindCoinBalancesCommand(args));
        this.registerCommand('find_coin_holders', args => new FindCoinHoldersCommand(args));
        this.registerCommand('find_last_txn', args => new FindLastTxnCommand(args));
        this.registerCommand('test_rpc_endpoints', args => new TestRpcEndpointsCommand(args));
        this.registerCommand('transform_balances_json_to_csv', args => new TransformBalancesJsonToCsvCommand(args));
        this.registerCommand('generate_random_addresses_and_balances', args => new GenerateRandomAddressesAndBalancesCommand(args));
    }

    /**
     * Registers a new Command
     * @param name - The name of the command
     * @param factory - A function to instantiate the Command
     */
    public registerCommand(name: string, factory: CommandFactory) {
        this.commandFactories[name] = factory;
    }

    async run(): Promise<void> {
        const args = process.argv.slice(3); // skip 'pnpm' and 'commando'
        const commandName = process.argv[2];

        // Show general help
        if (!commandName || commandName === '-h' || commandName === '--help') {
            this.printGeneralHelp();
            return;
        }

        // Instantiate the requested Command object
        const factory = this.commandFactories[commandName];
        if (!factory) {
            console.error(`Unknown command: ${commandName}`);
            this.printGeneralHelp();
            return;
        }
        const command = factory(args);

        // Show command usage
        if (args.includes('-h') || args.includes('--help')) {
            console.log(command.getUsage());
            return;
        }

        try {
            await command.execute();
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
        Object.keys(this.commandFactories).forEach(commandName => {
            const command = this.commandFactories[commandName]([]);
            console.log(`  - ${commandName}: ${command.getDescription()}`);
        });
        console.log('\nFor more information on a specific command, type:');
        console.log('  commando [command] -h');
    }
}
