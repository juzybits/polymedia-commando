/// will be replaced to `my_nft`
module demo::nft;

// === imports ===

use std::{
    string::{String},
};
use sui::{
    display::{Self},
    package::{Self},
};
use demo::{
    collection::{Collection, CollectionAdminCap},
};

// === structs ===

/// will be replaced to `MY_NFT`
public struct NFT has drop {}

/// will be replaced to `MyNft`
public struct Nft has key, store {
    id: UID,
    name: String,
    image_url: Option<String>,
}

// === initialization ===

fun init(otw: NFT, ctx: &mut TxContext)
{
    let publisher = package::claim(otw, ctx);

    let mut display = display::new<Nft>(&publisher, ctx);
    display.add(b"name".to_string(), b"{name}".to_string());
    display.add(b"image_url".to_string(), b"{image_url}".to_string());
    display.update_version();

    transfer::public_transfer(display, ctx.sender());
    transfer::public_transfer(publisher, ctx.sender());
}

// === functions ===

public fun new(
    _: &CollectionAdminCap,
    _: &Collection,
    name: vector<u8>,
    ctx: &mut TxContext,
): Nft {
    let nft = Nft {
        id: object::new(ctx),
        name: name.to_string(),
        image_url: option::none(),
    };
    nft
}

// === accessors ===

public fun name(self: &Nft): String { self.name }
public fun image_url(self: &Nft): Option<String> { self.image_url }
