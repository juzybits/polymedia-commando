module polymedia_bulksender::bulksender
{
    use std::vector;
    use sui::coin::{Self, Coin};
    use sui::pay;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    const E_LENGTH_MISMATCH: u64 = 1000;

    public fun send<T> (
        pay_coin: Coin<T>,
        amounts: vector<u64>,
        recipients: vector<address>,
        ctx: &mut TxContext,
    ): Coin<T>
    {
        assert!(vector::length(&amounts) == vector::length(&recipients), E_LENGTH_MISMATCH);

        while (vector::length(&amounts) > 0) {
            let amount: u64 = vector::pop_back(&mut amounts);
            let recipient: address = vector::pop_back(&mut recipients);
            pay::split_and_transfer(&mut pay_coin, amount, recipient, ctx);
        };

        return pay_coin
    }

    #[lint_allow(self_transfer)]
    entry fun send_entry<T> (
        pay_coin: Coin<T>,
        amounts: vector<u64>,
        recipients: vector<address>,
        ctx: &mut TxContext,
    )
    {
        let change: Coin<T> = send(pay_coin, amounts, recipients, ctx);
        if (coin::value(&change) > 0) {
            transfer::public_transfer(change, tx_context::sender(ctx));
        } else {
            coin::destroy_zero(change)
        };
    }
}
