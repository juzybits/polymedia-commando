export function log(message: string, data?: any) {
    if (global.outputQuiet) return;

    if (global.outputJson) {
        console.log(JSON.stringify({ message, data }));
    } else {
        console.log(formatMessage("", message, data));
    }
}

export function debug(message: string, data?: any) {
    if (!global.outputVerbose) return;

    if (global.outputJson) {
        console.log(JSON.stringify({ type: "debug", message, data }));
    } else {
        console.log(formatMessage("", message, data));
    }
}

export function error(message: string, data?: any) {
    if (global.outputJson) {
        console.error(JSON.stringify({ type: "error", message, data }));
    } else {
        console.error(formatMessage("error", message, data));
    }
}

function formatMessage(prefix: string, message: string, data?: any): string {
    const prefixStr = prefix ? `${prefix}: ` : "";
    const dataStr = data !== undefined ? ` ${formatData(data)}` : "";
    return `${prefixStr}${message}${dataStr}`;
}

function formatData(data: any): string {
    if (data === undefined || data === null) {
        return String(data);
    }
    if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
        return String(data);
    }
    return JSON.stringify(data, null, 2);
}
