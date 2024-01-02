import { BaseCommand } from './BaseCommand.js';
import { FindLastTransactionCommand } from './commands/find_last_txn.js';

export class Commando {
    private commands: Record<string, BaseCommand>;

    constructor() {
        this.commands = {
            'find_last_txn': new FindLastTransactionCommand(),
        };
    }

    public async run(): Promise<void> {
        const args = process.argv.slice(3); // skip 'pnpm' and 'commando'
        const subCommand = process.argv[2];

        const command = this.commands[subCommand];
        if (!command) {
            console.error(`Unknown command: ${subCommand}`);
            process.exit(1);
        }

        await command.run(args);
    }
}
