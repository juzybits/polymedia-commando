import { FindLastTransactionCommand } from './commands/find_last_txn.js';

export interface BaseCommand {
    getUsage(): string;
    execute(args: string[]): Promise<void>;
}

export class Commando {
    private commands: Record<string, BaseCommand>;

    constructor() {
        this.commands = {
            'find_last_txn': new FindLastTransactionCommand(),
        };
    }

    async run(): Promise<void> {
        const args = process.argv.slice(3); // skip 'pnpm' and 'commando'
        const subCommand = process.argv[2];

        // Check for '-h' or '--help' without a subcommand
        if (!subCommand || subCommand === '-h' || subCommand === '--help') {
            this.printGeneralHelp();
            return;
        }

        const command = this.commands[subCommand];
        if (!command) {
            console.error(`Unknown command: ${subCommand}`);
            this.printGeneralHelp();
            process.exit(1);
        }

        if (args.includes('-h') || args.includes('--help')) {
            console.log(command.getUsage());
            return;
        }

        try {
            await command.execute(args);
        } catch (error) {
            console.error(`Error executing ${subCommand}:`, error);
            process.exit(1);
        }
    }

    private printGeneralHelp(): void {
        console.log('Usage: commando [command] [options]');
        console.log('Available commands:');
        for (const command in this.commands) {
            console.log(`- ${command}`);
        }
    }
}
