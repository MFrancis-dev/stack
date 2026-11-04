//! Owner-only fund movements. Roadmap: K1.5 · Invariants: I1, I4
use crate::ft::ext_ft;
use crate::*;
use near_sdk::{Promise, PromiseError};

#[near]
impl Vault {
    /// Owner + 1 yocto. Sends USDC to the owner. Always available, paused or not.
    #[payable]
    pub fn withdraw(&mut self, amount: U128) -> Promise {
        near_sdk::assert_one_yocto();
        self.assert_owner();
        require!(amount.0 > 0, "amount must be positive");
        ext_ft::ext(self.usdc.clone())
            .with_attached_deposit(ONE_YOCTO)
            .with_static_gas(GAS_FT_TRANSFER)
            .ft_transfer(self.owner.clone(), amount, Some("stack withdraw".to_string()))
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_CALLBACK)
                    .on_withdraw(amount),
            )
    }

    /// Owner + 1 yocto. Sends any other NEP-141 token held by the vault to the owner.
    /// USDC goes through `withdraw` instead.
    #[payable]
    pub fn recover_token(&mut self, token: AccountId, amount: U128) -> Promise {
        near_sdk::assert_one_yocto();
        self.assert_owner();
        require!(token != self.usdc, "Use withdraw for USDC");
        require!(amount.0 > 0, "amount must be positive");
        ext_ft::ext(token.clone())
            .with_attached_deposit(ONE_YOCTO)
            .with_static_gas(GAS_FT_TRANSFER)
            .ft_transfer(self.owner.clone(), amount, Some("stack recover".to_string()))
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_CALLBACK)
                    .on_recover(token, amount),
            )
    }

    #[private]
    pub fn on_withdraw(&mut self, amount: U128, #[callback_result] result: Result<(), PromiseError>) -> bool {
        if result.is_ok() {
            VaultEvent::Withdrawn { amount }.emit();
            true
        } else {
            VaultEvent::WithdrawFailed { amount }.emit();
            false
        }
    }

    #[private]
    pub fn on_recover(
        &mut self,
        token: AccountId,
        amount: U128,
        #[callback_result] result: Result<(), PromiseError>,
    ) -> bool {
        if result.is_ok() {
            VaultEvent::TokenRecovered { token, amount }.emit();
        }
        result.is_ok()
    }
}
