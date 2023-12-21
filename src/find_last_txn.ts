import { getFullnodeUrl, PaginatedEvents, SuiClient, SuiEvent } from '@mysten/sui.js/client';

// Quick demo to pull the latest transaction for an address

async function main() {
    const networkName = 'mainnet'; // TODO
    console.log(`Active network: ${networkName}`);
    const suiClient = new SuiClient({ url: getFullnodeUrl(networkName)});
    const res: PaginatedEvents = await suiClient.queryEvents({
        query: {
            Sender: '0x57909e7d18c1092e05c9405997aa2238341e547cbf017eea4a65ef83adffbaa4',
        },
        limit: 1,
        order: 'descending',
    });
    const data: SuiEvent = res.data[0];
    const date = new Date(parseInt(data.timestampMs || '0'));
    console.log(data, date);
}

main();

export {};
