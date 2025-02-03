module demo::wrapper;

// === imports ===

use sui::{
    package::{Self},
};
use demo::{
    collection::{Collection, CollectionAdminCap},
    nft::{Nft},
};

// === structs ===

public struct WRAPPER has drop {}

public struct Wrapper has key, store {
    id: UID,
    nft: Nft,
}

// === initialization ===

fun init(otw: WRAPPER, ctx: &mut TxContext)
{
    let publisher = package::claim(otw, ctx);
    transfer::public_transfer(publisher, ctx.sender());
}

// === functions ===

public fun new(
    _: &CollectionAdminCap,
    _: &Collection,
    nft: Nft,
    ctx: &mut TxContext,
): Wrapper {
    return Wrapper {
        id: object::new(ctx),
        nft: nft,
    }
}

// === accessors ===

public fun borrow_nft(self: &Wrapper): &Nft { &self.nft }
