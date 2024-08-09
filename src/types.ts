/**
 * A command in the Zui framework.
 */
export type ZuiCommand = {
    /** Return a short description of the command. */
    getDescription(): string;
    /** Execute the command logic. */
    execute(args: string[]): Promise<void>;
};

export type AddressAndBalance = {
    address: string;
    balance: number; // TODO use bigint
};
