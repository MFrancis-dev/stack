//! NEP-141 receiver. Roadmap: K1.3
use crate::*;
use near_sdk::PromiseOrValue;

#[near]
impl Vault {
    /// Keeps every token sent with `ft_transfer_call` (returns 0 unused) and emits `deposited`.
    /// Non-USDC tokens stay recoverable via `recover_token`. Plain `ft_transfer` deposits
    /// arrive without calling this; the app reads the balance with `ft_balance_of`.
    pub fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> PromiseOrValue<U128> {
        let _ = msg;
        VaultEvent::Deposited { token: env::predecessor_account_id(), sender_id, amount }.emit();
        PromiseOrValue::Value(U128(0))
    }
}
