export type NetworkName =  'mainnet' | 'testnet' | 'devnet' | 'localnet';

export type AddressAndBalance = {
    address: string;
    balance: number; // TODO use bigint
};

export abstract class Command {
    /** Returns a short description of the command. */
    abstract getDescription(): string;
    /** Returns detailed usage information for the command. */
    abstract getUsage(): string;
    /** Executes the command logic. */
    abstract execute(): Promise<void>;

    constructor(protected args: string[]) {}
}

export type CommandFactory = (args: string[]) => Command;
