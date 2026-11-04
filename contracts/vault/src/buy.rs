//! Bounded scheduled buys. Roadmap: K1.4 · Invariants: I1, I2, I3, I6
use crate::*;
use near_sdk::{Promise, PromiseError};

#[near]
impl Vault {
    /// Keeper only. Requires !paused, a plan, `now >= last_run_at_s + interval_s`,
    /// `amount <= amount_per_run`. Registers `deposit_address` on USDC if needed
    /// (🔍 K0.9), then `ft_transfer`s USDC to it.
    #[payable]
    pub fn execute_buy(&mut self, quote_ref: String, deposit_address: AccountId, amount: U128) -> Promise {
        self.assert_keeper();
        let _ = (quote_ref, deposit_address, amount);
        todo!("K1.4")
    }

    /// Restores `last_run_at_s` if the transfer failed (I6) and emits `buy_failed`.
    #[private]
    pub fn on_buy_transfer(
        &mut self,
        quote_ref: String,
        previous_last_run_at_s: u64,
        #[callback_result] result: Result<(), PromiseError>,
    ) {
        let _ = (quote_ref, previous_last_run_at_s, result);
        todo!("K1.4")
    }
}
