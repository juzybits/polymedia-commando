import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

import { bcs, BcsType, fromHex, toHex } from "@mysten/bcs";
import init, { update_constants, update_identifiers } from "@mysten/move-bytecode-template/move_bytecode_template.js";

import { validateAndNormalizeAddress } from "@polymedia/suitcase-core";

type BytecodeTransform = {
    bytecodeInputFile: string;
    bytecodeOutputFile: string;
    identifiers: Record<string, string>;
    constants: {
        moveType: string;
        oldVal: unknown;
        newVal: unknown;
    }[];
};

const identifiers = {
    // "nft": "my_nft", // TODO: module doesn't work
    // "NFT": "MY_NFT", // TODO: OTW doesn't work
    "Nft": "MyNft", // struct works
};

const bytecodeTransforms: BytecodeTransform[] = [ // TODO read from arguments
    {
        bytecodeInputFile: "../sui-demo/build/Demo/bytecode_modules/collection.mv",
        bytecodeOutputFile: "./out/collection.mv",
        identifiers,
        constants: [
            { // A_BOOL
                moveType: "Bool",
                oldVal: false,
                newVal: true,
            },
            { // A_U8
                moveType: "U8",
                oldVal: 1,
                newVal: 9,
            },
            { // A_U64
                moveType: "U64",
                oldVal: 1000,
                newVal: 9000,
            },
            { // A_ADDR
                moveType: "Address",
                oldVal: "0x111",
                newVal: "0x999",
            },
            { // A_STR
                moveType: "Vector(U8)",
                oldVal: "demo value",
                newVal: "my value",
            },
            { // A_VEC_BOOL
                moveType: "Vector(Bool)",
                oldVal: [ false, false, false ],
                newVal: [ true, true, true ],
            },
            { // A_VEC_U8
                moveType: "Vector(U8)",
                oldVal: [ 1, 2, 3 ],
                newVal: [ 9, 8, 7 ],
            },
            { // A_VEC_U64
                moveType: "Vector(U64)",
                oldVal: [ 1000, 2000, 3000 ],
                newVal: [ 9000, 8000, 7000 ],
            },
            { // A_VEC_ADDR
                moveType: "Vector(Address)",
                oldVal: [ "0x111", "0x222", "0x333" ],
                newVal: [ "0x999", "0x888", "0x777" ],
            },
            { // A_VEC_STR
                moveType: "Vector(Vector(U8))",
                oldVal: [ "demo value 1", "demo value 2", "demo value 3" ],
                newVal: [ "my value 1", "my value 2", "my value 3" ],
            },
            { // A_VEC_VEC_U8
                moveType: "Vector(Vector(U8))",
                oldVal: [
                    [ 10, 11, 12 ],
                    [ 20, 21, 22 ],
                    [ 30, 31, 32 ],
                ],
                newVal: [
                    [ 90, 91, 92 ],
                    [ 80, 81, 82 ],
                    [ 70, 71, 72 ],
                ],
            },
            { // A_VEC_VEC_STR
                moveType: "Vector(Vector(Vector(U8)))",
                oldVal: [
                    [ "demo A0", "demo A1" ],
                    [ "demo B0", "demo B1" ],
                    [ "demo C0", "demo C1" ],
                ],
                newVal: [
                    [ "my A0", "my A1" ],
                    [ "my B0", "my B1" ],
                    [ "my C0", "my C1" ],
                ],
            },
            { // A_VEC_VEC_VEC_U64
                moveType: "Vector(Vector(Vector(U64)))",
                oldVal: [
                    [
                        [ 1000, 1001, 1002 ],
                        [ 1003, 1004, 1005 ],
                    ],
                    [
                        [ 2000, 2001, 2002 ],
                        [ 2003, 2004, 2005 ],
                    ],
                ],
                newVal: [
                    [
                        [ 9000, 9001, 9002],
                        [ 9003, 9004, 9005 ],
                    ],
                    [
                        [ 8000, 8001, 8002 ],
                        [ 8003, 8004, 8005 ],
                    ],
                ],
            },
        ],
    },
    {
        bytecodeInputFile: "../sui-demo/build/Demo/bytecode_modules/nft.mv",
        bytecodeOutputFile: "./out/nft.mv",
        identifiers,
        constants: [],
    },
];

export async function bytecodeTransform({
}:{
}): Promise<void>
{
    await init(loadWasmModule());
    for (const transform of bytecodeTransforms) {
        const bytecode = fs.readFileSync(transform.bytecodeInputFile);
        const updatedBytecode = transformBytecode({
            bytecode: new Uint8Array(bytecode),
            identifiers: transform.identifiers,
            constants: transform.constants,
        });
        fs.writeFileSync(transform.bytecodeOutputFile, updatedBytecode);
    }
}

function loadWasmModule(): Buffer {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const wasmPath = path.resolve(__dirname, "../node_modules/@mysten/move-bytecode-template/move_bytecode_template_bg.wasm");
        return fs.readFileSync(wasmPath);
    } catch (e) {
        throw new Error(`Failed to load WASM module: ${e}`);
    }
}

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
        const bcsType = getConstantBcsType(moveType, oldVal);
        updated = update_constants(
            updated,
            bcsType.serialize(newVal).toBytes(),
            bcsType.serialize(oldVal).toBytes(),
            moveType,
        );
    }

    return updated;
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
): BcsType<unknown, any> // eslint-disable-line @typescript-eslint/no-explicit-any
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
            throw new Error(`Invalid value for Vector(U8): ${value}`);
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
                    throw new Error(`Invalid address: ${val}`);
                }
                return fromHex(normalized);
            },
            output: (val) => toHex(val),
        });
    }

    // Base types
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

function isStringValue(val: unknown): boolean {
    return typeof val === "string";
}

function isNumberArray(val: unknown): boolean {
    return Array.isArray(val) && val.every(item => typeof item === "number");
}
