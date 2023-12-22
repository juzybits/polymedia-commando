import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

import { SuiClient } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from '@mysten/sui.js/utils';

/**
 * Build a Ed25519Keypair object for the current active address,
 * by loading the secret key from ~/.sui/sui_config/sui.keystore
 */
export function getActiveAddressKeypair(): Ed25519Keypair {
    const sender = execSync('sui client active-address', { encoding: 'utf8' }).trim();

    const signer = (() => {
        const fileContent = readFileSync(
            path.join(homedir(), '.sui', 'sui_config', 'sui.keystore'),
            'utf8'
        );
        const keystore = JSON.parse(fileContent);

        for (const priv of keystore) {
            const raw = fromB64(priv);
            if (raw[0] !== 0) {
                continue;
            }

            const pair = Ed25519Keypair.fromSecretKey(raw.slice(1));
            if (pair.getPublicKey().toSuiAddress() === sender) {
                return pair;
            }
        }

        throw new Error(`keypair not found for sender: ${sender}`);
    })();

    return signer;
}

export function getActiveEnv():  'mainnet' | 'testnet' | 'devnet' | 'localnet' {
    const activeEnv = execSync('sui client active-env', { encoding: 'utf8' }).trim();
    return activeEnv as 'mainnet' | 'testnet' | 'devnet' | 'localnet';
}

type SuiClientWithEndpoint = SuiClient & {
    endpoint: string;
};
export class SuiClientRotator {
    private readonly clients: SuiClientWithEndpoint[];
    private readonly endpoints = [
        'https://mainnet-rpc.sui.chainbase.online',
        // 'https://mainnet.sui.rpcpool.com',                   // 403 forbidden when using VPN
        'https://mainnet.suiet.app',
        'https://rpc-mainnet.suiscan.xyz',
        'https://sui-mainnet-endpoint.blockvision.org',
        'https://sui-mainnet.public.blastapi.io',
        'https://sui-rpc-mainnet.testnet-pride.com',
        // 'https://sui1mainnet-rpc.chainode.tech',             // 502 bad gateway
        // 'https://sui-mainnet-ca-1.cosmostation.io',
        // 'https://sui-mainnet-ca-2.cosmostation.io',
        // 'https://sui-mainnet-eu-1.cosmostation.io',          // 000
        // 'https://sui-mainnet-eu-2.cosmostation.io',          // 000
        'https://sui-mainnet-eu-3.cosmostation.io',
        // 'https://sui-mainnet-eu-4.cosmostation.io',
        // 'https://sui-mainnet-us-1.cosmostation.io',
        // 'https://sui-mainnet-us-2.cosmostation.io',
        'https://fullnode.mainnet.sui.io',
        'https://sui-mainnet-rpc-germany.allthatnode.com',
        // 'https://sui-mainnet-rpc-korea.allthatnode.com',     // too slow/far
        // 'https://sui-mainnet-rpc.allthatnode.com',
        'https://sui-mainnet.nodeinfra.com',
        'https://sui.publicnode.com',
        'https://sui-mainnet-rpc.bartestnet.com',
    ];

    constructor() {
        this.clients = [];
        for (const endpoint of this.endpoints) {
            let client = new SuiClient({ url: endpoint });
            const clientWithEndpoint = Object.assign(client, { endpoint });
            this.clients.push(clientWithEndpoint);
        }
    }

    public async testEndpoints(): Promise<void> {
        console.log(`\ntesting ${this.clients.length} endpoints\n`);

        const startTime = Date.now();
        for (const client of this.clients) {
            // console.log(`----- ${client.endpoint} -----`);
            console.time(`time - ${client.endpoint}`);
            const balance = await client.getBalance({
                owner: '0x8ec0945def230349b2cbd72abd0a91ceb1ca8a4604474d03ef16379414f05a10',
                coinType: '0x2::sui::SUI',
            });
            console.timeEnd(`time - ${client.endpoint}`);
            // console.log(balance.totalBalance);
        }
        const endTime = Date.now();
        const totalTime = (endTime - startTime) / 1000;
        const reqPerSec = this.clients.length / totalTime;
        console.log(`\nTotal time: ${totalTime} seconds`);
        console.log(`Requests per second: ${reqPerSec}\n`);
    }
}
