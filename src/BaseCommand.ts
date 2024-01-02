export abstract class BaseCommand {
    protected abstract getUsage(): string;
    protected abstract execute(args: string[]): Promise<void>;

    public async run(args: string[]): Promise<void> {
        if (args.includes('-h') || args.includes('--help')) {
            console.log(this.getUsage());
            return;
        }

        try {
            await this.execute(args);
        } catch (error) {
            console.error('An error occurred:', error);
            process.exit(1);
        }
    }
}
