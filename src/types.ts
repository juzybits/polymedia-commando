export type NetworkName =  'mainnet' | 'testnet' | 'devnet' | 'localnet';

export type AddressAndBalance = {
    address: string;
    balance: number; // TODO use bigint
};
