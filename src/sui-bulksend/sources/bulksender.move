module polymedia_bulksender::bulksender;

use sui::{
    coin::{Self, Coin},
    pay::{Self},
};

const E_LENGTH_MISMATCH: u64 = 1000;

public fun send<T>(
    mut pay_coin: Coin<T>,
    mut amounts: vector<u64>,
    mut recipients: vector<address>,
    ctx: &mut TxContext,
) {
    assert!(amounts.length() == recipients.length(), E_LENGTH_MISMATCH);

    while (amounts.length() > 0) {
        let amount = amounts.pop_back();
        let recipient = recipients.pop_back();
        pay::split_and_transfer(&mut pay_coin, amount, recipient, ctx);
    };

    coin::destroy_zero(pay_coin);
}
