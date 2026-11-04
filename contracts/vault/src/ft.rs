//! NEP-141 cross-contract interface used by the vault.
use near_sdk::json_types::U128;
use near_sdk::{ext_contract, AccountId};

#[allow(dead_code)]
#[ext_contract(ext_ft)]
pub(crate) trait FungibleToken {
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
    fn storage_deposit(&mut self, account_id: Option<AccountId>, registration_only: Option<bool>);
}
