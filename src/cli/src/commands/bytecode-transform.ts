import { spawnSync } from "child_process";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

import { bcs, BcsType, fromHex, toHex } from "@mysten/bcs";
import initWasmModule, { get_constants, update_constants, update_identifiers } from "@mysten/move-bytecode-template/move_bytecode_template.js";

import { validateAndNormalizeAddress } from "@polymedia/suitcase-core";

import { log, debug, error } from "../logger.js";

// === types ===

type TransformConfig = {
    outputDir: string; // path where the transformed bytecode files will be saved
    identifiers: Record<string, string>; // map of old identifiers (modules/functions/fields) to new ones
    files: {
        bytecodeInputFile: string; // path to the bytecode file to transform
        constants: {
            moveType: string; // Move type of the constant, e.g. `vector<u8>`
            oldVal: unknown; // current value of the constant in the original bytecode
            newVal: unknown; // desired value of the constant in the transformed bytecode
        }[];
    }[];
};

// === main ===

export async function bytecodeTransform({
    configFile,
    buildDir,
}:{
    configFile: string;
    buildDir?: string;
}): Promise<void>
{
    await loadWasmModule();

    const config = loadTransformConfig(configFile);

    buildDir && executeBuildCommand(buildDir);

    createOrEmptyOutputDir(config.outputDir);

    checkInputFilesExist(config.files.map(f => f.bytecodeInputFile));

    // apply transformations to each bytecode file
    log("Transforming bytecode...");
    for (const transform of config.files) {
        debug(`- ${transform.bytecodeInputFile}`);
        const bytecode = fs.readFileSync(transform.bytecodeInputFile);
        const updatedBytecode = transformBytecode({
            bytecode: new Uint8Array(bytecode),
            identifiers: config.identifiers,
            constants: transform.constants,
        });

        // get the filename from the input path and use it for output
        const outputFile = path.join(config.outputDir, path.basename(transform.bytecodeInputFile));
        fs.writeFileSync(outputFile, updatedBytecode);
    }
    log("Modified bytecode was saved to", config.outputDir);
}

// === setup ===

async function loadWasmModule() {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const wasmPath = path.resolve(__dirname, "../../node_modules/@mysten/move-bytecode-template/move_bytecode_template_bg.wasm");
        const wasm = fs.readFileSync(wasmPath);
        await initWasmModule(wasm);
    } catch (e) {
        error("Failed to load WASM module", e);
        process.exit(1);
    }
}

function loadTransformConfig(configFile: string): TransformConfig {

    if (!fs.existsSync(configFile)) {
        error("Config file does not exist", configFile);
        process.exit(1);
    }
    if (!fs.statSync(configFile).isFile()) {
        error("Config file is not a file", configFile);
        process.exit(1);
    }
    const c = JSON.parse(fs.readFileSync(configFile, "utf8"));

    if (!c || typeof c !== "object") {
        error("Config must be an object");
        process.exit(1);
    }

    if (!c.outputDir || typeof c.outputDir !== "string") {
        error("Config must have an 'outputDir' string");
        process.exit(1);
    }

    if (!c.identifiers || typeof c.identifiers !== "object") {
        error("Config must have an 'identifiers' object");
        process.exit(1);
    }

    if (!Array.isArray(c.files)) {
        error("Config must have a 'files' array");
        process.exit(1);
    }

    for (const file of c.files) {
        if (!file.bytecodeInputFile || typeof file.bytecodeInputFile !== "string") {
            error("Each file must have a 'bytecodeInputFile' string");
            process.exit(1);
        }
        if (!Array.isArray(file.constants)) {
            error("Each file must have a 'constants' array");
            process.exit(1);
        }

        for (const constant of file.constants) {
            if (!constant.moveType || typeof constant.moveType !== "string") {
                error("Each constant must have a 'moveType' string");
                process.exit(1);
            }
            if (!("oldVal" in constant)) {
                error("Each constant must have an 'oldVal'");
                process.exit(1);
            }
            if (!("newVal" in constant)) {
                error("Each constant must have a 'newVal'");
                process.exit(1);
            }
        }
    }

    return c as TransformConfig;
}

function executeBuildCommand(buildDir: string): void {
    log("Building Move package...");

    const buildCmd = ["sui", "move", "build"];
    buildCmd.push("--path", buildDir);

    if (global.outputJson) {
        buildCmd.push("--json-errors");
    }

    if (global.outputQuiet) {
        buildCmd.push("--silence-warnings");
    }

    debug("Running build command", buildCmd.join(" "));

    const result = spawnSync(buildCmd[0], buildCmd.slice(1), {
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8"
    });

    // Process build output (from stderr)
    if (result.stderr && !global.outputQuiet) {
        const lines = result.stderr.trim().split("\n");
        for (const line of lines) {
            if (line.trim()) {
                log(line);
            }
        }
    }

    // Check for actual errors via exit code
    if (result.status !== 0) {
        error("Build command failed with status", result.status);
        process.exit(1);
    }
}

function createOrEmptyOutputDir(outputDir: string): void {
    // ensure output directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    // delete .mv files in the output directory
    for (const file of fs.readdirSync(outputDir)) {
        if (file.endsWith(".mv")) {
            fs.unlinkSync(path.join(outputDir, file));
        }
    }
}

function checkInputFilesExist(files: string[]): void {
    for (const file of files) {
        if (!fs.existsSync(file)) {
            error("Input file does not exist", file);
            process.exit(1);
        }
        if (!fs.statSync(file).isFile()) {
            error("Input file is not a file", file);
            process.exit(1);
        }
    }
}

// === bytecode transformation ===

/**
 * Call `update_identifiers` and `update_constants` to transform the bytecode.
 */
function transformBytecode({
    bytecode, identifiers, constants,
}: {
    bytecode: Uint8Array;
    identifiers: Record<string, string>;
    constants: { moveType: string; oldVal: unknown; newVal: unknown }[];
}): Uint8Array
{
    let updated = update_identifiers(bytecode, identifiers);
    for (const constant of constants) {
        const { moveType, oldVal, newVal } = constant;
        if (oldVal === newVal) {
            continue;
        }
        const normalizedType = normalizeConstantType(moveType);
        const bcsType = getConstantBcsType(normalizedType, oldVal);
        const constantsBefore = JSON.stringify(get_constants(updated));
        updated = update_constants(
            updated,
            bcsType.serialize(newVal).toBytes(),
            bcsType.serialize(oldVal).toBytes(),
            normalizedType,
        );
        if (constantsBefore === JSON.stringify(get_constants(updated))) {
            error(`Didn't update constant '${normalizedType}' with value ${oldVal} to ${newVal}. Make sure 'moveType' and 'oldVal' are correct in your config. You may need to \`sui move build\` again.`);
            process.exit(1);
        }
    }

    return updated;
}

/**
 * Convert types like `vector<u8>` to `Vector(U8)`
 * */
function normalizeConstantType(moveType: string): string {
    return moveType
        .replace(/\s+/g, "") // remove whitespace
        .replace(/\b[a-z]+\d*\b/g, m => m[0].toUpperCase() + m.slice(1))
        .replace(/</g, "(")
        .replace(/>/g, ")");
}

/**
 * Get a `BcsType` to serialize/deserialize the value of a constant.
 *
 * Valid constant types:
 * - U8, U16, U32, U64, U128, U256, Bool, Address, Vector(_)
 *
 * Note that Vector(U8) can be an array of numbers or a string.
 *
 * @param moveType - The Move type of the constant, capitalized: U8, Address, Vector(U8), etc.
 * @param value - The value of the constant.
 */
function getConstantBcsType(
    moveType: string,
    value: unknown,
): BcsType<unknown, any>
{
    const type = moveType.trim();

    if (type.startsWith("Vector("))
    {
        const innerType = type.slice(7, -1).trim();

        // Vector(U8) can be an array of numbers or a string
        if (innerType === "U8") {
            if (isStringValue(value)) {
                return bcs.string();
            }
            if (isNumberArray(value)) {
                return bcs.vector(bcs.u8());
            }
            error("Invalid value for Vector(U8)", value);
            process.exit(1);
        }

        // regular vector cases
        const innerValue: unknown = (Array.isArray(value) && value.length > 0)
            ? value[0] // take 1st element as sample
            : null;
        return bcs.vector(getConstantBcsType(innerType, innerValue));
    }

    if (type === "Address")
    {
        return bcs.bytes(32).transform({
            input: (val: string) => {
                const normalized = validateAndNormalizeAddress(val);
                if (normalized === null) {
                    error("Invalid address", val);
                    process.exit(1);
                }
                return fromHex(normalized);
            },
            output: (val) => toHex(val),
        });
    }

    // base types
    switch (type)
    {
        case "U8": return bcs.u8();
        case "U16": return bcs.u16();
        case "U32": return bcs.u32();
        case "U64": return bcs.u64();
        case "U128": return bcs.u128();
        case "U256": return bcs.u256();
        case "Bool": return bcs.bool();
        default:
            throw new Error(`Unsupported Move type: ${type}`);
    }
}

// === helpers ===

function isStringValue(val: unknown): boolean {
    return typeof val === "string";
}

function isNumberArray(val: unknown): boolean {
    return Array.isArray(val) && val.every(item => typeof item === "number");
}
