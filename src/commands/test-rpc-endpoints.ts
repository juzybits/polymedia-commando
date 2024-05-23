import { SuiMultiClient } from "@polymedia/suitcase-core";
import { getActiveEnv } from "@polymedia/suitcase-node";
import { Command } from "../Commando.js";

export class TestRpcEndpointsCommand implements Command {
    public getDescription(): string {
        return "Test the latency of various Sui RPC endpoints";
    }

    public getUsage(): string {
        return `${this.getDescription()}

Usage:
  test-rpc-endpoints
`;
    }

    public async execute(): Promise<void>
    {
        const network = getActiveEnv();
        const multiClient = SuiMultiClient.newWithDefaultEndpoints(network);
        const getBalanceParams = {
            coinType: "0x2::sui::SUI",
            owner: network === "mainnet"
                ? "0x8ec0945def230349b2cbd72abd0a91ceb1ca8a4604474d03ef16379414f05a10"
                : "0x7d20dcdb2bca4f508ea9613994683eb4e76e9c4ed371169677c1be02aaf0b58e"
        };
        await multiClient.testEndpoints(async client => {
            const balance = await client.getBalance(getBalanceParams);
            console.log(`\nbalance: ${balance.totalBalance}`);
        });
    }
}
