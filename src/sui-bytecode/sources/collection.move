module demo::collection;

// === imports ===

use std::string::{String};
use sui::table::{Self, Table};

// === constants ===

// basic primitives
const A_BOOL: bool = false;
const A_U8: u8 = 1;
const A_U64: u64 = 1000;
const A_ADDR: address = @0x111;
const A_STR: vector<u8> = b"demo value";

// vectors
const A_VEC_BOOL: vector<bool> = vector[ false, false, false ];
const A_VEC_U8: vector<u8> = vector[ 1, 2, 3 ];
const A_VEC_U64: vector<u64> = vector[ 1000, 2000, 3000 ];
const A_VEC_ADDR: vector<address> = vector[ @0x111, @0x222, @0x333 ];
const A_VEC_STR: vector<vector<u8>> = vector[ b"demo value 1", b"demo value 2", b"demo value 3" ];

// multi-dimensional vectors
const A_VEC_VEC_U8: vector<vector<u8>> = vector[
    vector[ 10, 11, 12 ],
    vector[ 20, 21, 22 ],
    vector[ 30, 31, 32 ],
];
const A_VEC_VEC_STR: vector<vector<vector<u8>>> = vector[
    vector[ b"demo A0", b"demo A1" ],
    vector[ b"demo B0", b"demo B1" ],
    vector[ b"demo C0", b"demo C1" ],
];
const A_VEC_VEC_VEC_U64: vector<vector<vector<u64>>> = vector[
    vector[
        vector[ 1000, 1001, 1002 ],
        vector[ 1003, 1004, 1005 ],
    ],
    vector[
        vector[ 2000, 2001, 2002 ],
        vector[ 2003, 2004, 2005 ],
    ],
];

// === structs ===

public struct COLLECTION has drop {}

public struct CollectionAdminCap has key, store {
    id: UID,
}

public struct Collection has key {
    id: UID,
    nfts: Table<address, u64>,
    a_bool: bool,
    a_u8: u8,
    a_u64: u64,
    a_addr: address,
    a_str: String,
    a_vec_bool: vector<bool>,
    a_vec_u8: vector<u8>,
    a_vec_u64: vector<u64>,
    a_vec_addr: vector<address>,
    a_vec_str: vector<String>,
    a_vec_vec_u8: vector<vector<u8>>,
    a_vec_vec_str: vector<vector<String>>,
    a_vec_vec_vec_u64: vector<vector<vector<u64>>>,
}

// === initialization ===

fun init(_otw: COLLECTION, ctx: &mut TxContext)
{
    let collection = Collection {
        id: object::new(ctx),
        nfts: table::new(ctx),
        a_bool: A_BOOL,
        a_u8: A_U8,
        a_u64: A_U64,
        a_addr: A_ADDR,
        a_str: A_STR.to_string(),
        a_vec_bool: A_VEC_BOOL,
        a_vec_u8: A_VEC_U8,
        a_vec_u64: A_VEC_U64,
        a_vec_addr: A_VEC_ADDR,
        a_vec_str: A_VEC_STR.map!(|v| v.to_string()),
        a_vec_vec_u8: A_VEC_VEC_U8,
        a_vec_vec_str: A_VEC_VEC_STR.map!(|v| v.map!(|v| v.to_string())),
        a_vec_vec_vec_u64: A_VEC_VEC_VEC_U64,
    };

    let cap = CollectionAdminCap {
        id: object::new(ctx),
    };

    transfer::share_object(collection);
    transfer::transfer(cap, ctx.sender());
}
