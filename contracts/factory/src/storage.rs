//! USDC `storage_deposit` for new vaults. Mandatory: Intents gives no refund to an
//! unregistered NEAR receiver (ARCHITECTURE §12). Roadmap: K1.7
use crate::*;
use near_sdk::ext_contract;

#[allow(dead_code)]
#[ext_contract(ext_ft)]
trait StorageManagement {
    fn storage_deposit(&mut self, account_id: Option<AccountId>, registration_only: Option<bool>);
}

impl Factory {
    pub(crate) fn register_vault_on_usdc(&self, owner: AccountId, vault: AccountId) -> Promise {
        ext_ft::ext(self.usdc.clone())
            .with_attached_deposit(USDC_STORAGE_DEPOSIT)
            .with_static_gas(GAS_STORAGE_DEPOSIT)
            .storage_deposit(Some(vault.clone()), Some(true))
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_CALLBACK)
                    .on_vault_registered(owner, vault),
            )
    }
}

#[near]
impl Factory {
    /// `storage_deposit` returns a StorageBalance object, so read the raw result instead of
    /// deserializing it into `()` (which would panic).
    #[private]
    pub fn on_vault_registered(&mut self, owner: AccountId, vault: AccountId) -> bool {
        if env::promise_result_checked(0, 1_024).is_ok() {
            FactoryEvent::VaultCreated { owner, vault }.emit();
            true
        } else {
            FactoryEvent::VaultRegistrationFailed { owner, vault }.emit();
            false
        }
    }

    /// Keeper only: retry USDC registration for a vault whose registration failed.
    pub fn retry_registration(&mut self, owner: AccountId) -> Promise {
        require!(env::predecessor_account_id() == self.keeper, "Only the keeper");
        let vault = self.vaults.get(&owner).cloned().unwrap_or_else(|| env::panic_str("No vault"));
        self.register_vault_on_usdc(owner, vault)
    }
}
