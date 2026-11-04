//! Bounded scheduled buys. Roadmap: K1.4 · Invariants: I1, I2, I3, I6
use crate::ft::ext_ft;
use crate::*;
use near_sdk::{Promise, PromiseError};

#[near]
impl Vault {
    /// Keeper only. Requires: not paused, a plan, `now >= last_run_at_s + interval_s`,
    /// `0 < amount <= amount_per_run`.
    ///
    /// If the keeper attaches NEAR, it is used to storage-register `deposit_address` on USDC
    /// first (registration_only, so an already-registered address gets it refunded). An
    /// unregistered receiver would make the transfer fail.
    ///
    /// Sends `amount` USDC to `deposit_address`. If the transfer fails, the callback restores
    /// `last_run_at_s` so the vault can run again at the next interval (I6).
    #[payable]
    pub fn execute_buy(&mut self, quote_ref: String, deposit_address: AccountId, amount: U128) -> Promise {
        self.assert_keeper();
        require!(!self.paused, "Vault is paused");
        require!(self.has_plan(), "No plan");
        require!(
            !quote_ref.is_empty() && quote_ref.len() <= MAX_FIELD_LEN,
            "Invalid quote_ref"
        );
        require!(amount.0 > 0 && amount.0 <= self.amount_per_run, "Amount above amount_per_run");
        let now = Self::now_s();
        require!(
            now >= self.last_run_at_s.saturating_add(self.interval_s),
            "Too early for the next buy"
        );

        let previous_last_run_at_s = self.last_run_at_s;
        self.last_run_at_s = now;

        let transfer = ext_ft::ext(self.usdc.clone())
            .with_attached_deposit(ONE_YOCTO)
            .with_static_gas(GAS_FT_TRANSFER)
            .ft_transfer(deposit_address.clone(), amount, Some(format!("stack buy {quote_ref}")));

        let deposit = env::attached_deposit();
        let send = if deposit.is_zero() {
            transfer
        } else {
            ext_ft::ext(self.usdc.clone())
                .with_attached_deposit(deposit)
                .with_static_gas(GAS_STORAGE_DEPOSIT)
                .storage_deposit(Some(deposit_address.clone()), Some(true))
                .then(transfer)
        };

        send.then(
            Self::ext(env::current_account_id())
                .with_static_gas(GAS_CALLBACK)
                .on_buy_transfer(quote_ref, deposit_address, amount, previous_last_run_at_s),
        )
    }

    /// Emits `buy_sent`, or restores `last_run_at_s` and emits `buy_failed` (I6).
    #[private]
    pub fn on_buy_transfer(
        &mut self,
        quote_ref: String,
        deposit_address: AccountId,
        amount: U128,
        previous_last_run_at_s: u64,
        #[callback_result] result: Result<(), PromiseError>,
    ) -> bool {
        if result.is_ok() {
            VaultEvent::BuySent { quote_ref, deposit_address, amount }.emit();
            true
        } else {
            self.last_run_at_s = previous_last_run_at_s;
            VaultEvent::BuyFailed { quote_ref, deposit_address, amount }.emit();
            false
        }
    }
}
