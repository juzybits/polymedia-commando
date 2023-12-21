import { accessSync } from "fs";

export function fileExists(filename: string): boolean {
    try {
        accessSync(filename);
        return true;
    } catch (error) {
        return false;
    }
}
