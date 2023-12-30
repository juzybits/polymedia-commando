module polymedia_bulksender::bulksender
{
    use std::vector;
    use sui::coin::{Self, Coin};
    use sui::pay;
    use sui::tx_context::{TxContext};

    const E_LENGTH_MISMATCH: u64 = 1000;

    public fun send<T> (
        pay_coin: Coin<T>,
        amounts: vector<u64>,
        recipients: vector<address>,
        ctx: &mut TxContext,
    )
    {
        assert!(vector::length(&amounts) == vector::length(&recipients), E_LENGTH_MISMATCH);

        while (vector::length(&amounts) > 0) {
            let amount: u64 = vector::pop_back(&mut amounts);
            let recipient: address = vector::pop_back(&mut recipients);
            pay::split_and_transfer(&mut pay_coin, amount, recipient, ctx);
        };

        coin::destroy_zero(pay_coin);
    }
}
