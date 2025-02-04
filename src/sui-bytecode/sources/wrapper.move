/// will be replaced to `my_wrapper`
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

/// will be replaced to `MY_WRAPPER`
public struct WRAPPER has drop {}

/// will be replaced to `MyWrapper`
public struct Wrapper has key, store {
    id: UID,
    /// will be replaced to `my_nft`
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

/// will be replaced to `my_nft`
public fun nft(self: &Wrapper): &Nft { &self.nft }
