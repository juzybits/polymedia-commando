import { Command } from '../types.js';
import { SuiClientRotator } from '../utils/sui_utils.js';

export class TestRpcEndpointsCommand extends Command {
    constructor(args: string[]) {
        super(args);
    }

    public getDescription(): string {
        return 'Test Sui RPC endpoints by calling SuiRotator.testEndpoints()';
    }

    public getUsage(): string {
        return `${this.getDescription()}

Usage:
  test_rpc_endpoints
`;
    }

    public async execute(): Promise<void> {
        const rotator = new SuiClientRotator();
        rotator.testEndpoints();
    }
}
