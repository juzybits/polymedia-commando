import { error } from "./logger.js";

export function getEnvVarOrExit(name: string): string
{
    const value = process.env[name];
    if (!value) {
        error("missing required environment variable", name);
        process.exit(1);
    }
    return value;
}
