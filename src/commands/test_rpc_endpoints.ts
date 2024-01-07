import { Command } from '../Commando.js';
import { MultiSuiClient } from '../lib/sui_utils.js';

export class TestRpcEndpointsCommand implements Command {
    public getDescription(): string {
        return 'Test the latency of various Sui RPC endpoints';
    }

    public getUsage(): string {
        return `${this.getDescription()}

Usage:
  test_rpc_endpoints
`;
    }

    public async execute(_args: string[]): Promise<void>
    {
        const multiClient = new MultiSuiClient();
        multiClient.testEndpoints();
    }
}
