//! NEP-141 receiver. Roadmap: K1.3
use crate::*;
use near_sdk::PromiseOrValue;

#[near]
impl Vault {
    /// Accept every token (return 0 = keep all) and emit `deposited`.
    /// Non-USDC tokens stay recoverable via `recover_token`.
    pub fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> PromiseOrValue<U128> {
        let _ = (sender_id, amount, msg);
        todo!("K1.3")
    }
}
