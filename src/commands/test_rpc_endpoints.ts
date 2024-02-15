import { SuiMultiClient } from '@polymedia/suits';
import { Command } from '../Commando.js';

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

    public async execute(): Promise<void>
    {
        const multiClient = new SuiMultiClient();
        await multiClient.testEndpoints();
    }
}
