/**
 * A command in the Zui framework.
 */
export type ZuiCommand = {
    execute(args: string[]): Promise<void>;
};

export type AddressAndBalance = {
    address: string;
    balance: number; // TODO use bigint
};
