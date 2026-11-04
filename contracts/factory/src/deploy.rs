//! Sub-account creation + vault code deploy (regular deploy, KD-8). Roadmap: K1.7
use crate::*;
use near_sdk::{serde_json::json, PromiseError};

impl Factory {
    /// create account → fund → deploy → `new(owner, keeper, usdc)` in one batch, then
    /// `on_vault_deployed` registers it on USDC or rolls the bookkeeping back.
    pub(crate) fn deploy_vault(&mut self, owner: AccountId, vault: AccountId) -> Promise {
        let code = self.vault_code.get().clone().unwrap_or_else(|| env::panic_str("Vault code not set"));
        let storage = env::storage_byte_cost().saturating_mul(code.len() as u128 + 1_000);
        let init_balance = storage.saturating_add(VAULT_BALANCE_BUFFER);
        let args = json!({ "owner": owner, "keeper": self.keeper, "usdc": self.usdc })
            .to_string()
            .into_bytes();

        Promise::new(vault.clone())
            .create_account()
            .transfer(init_balance)
            .deploy_contract(code)
            .function_call("new".to_string(), args, NearToken::from_yoctonear(0), GAS_VAULT_INIT)
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_CALLBACK.saturating_add(GAS_STORAGE_DEPOSIT))
                    .on_vault_deployed(owner, vault),
            )
    }
}

#[near]
impl Factory {
    /// If the deploy batch failed: forget the vault and give the day's slot back
    /// (the attached balance returns to the factory automatically).
    #[private]
    pub fn on_vault_deployed(
        &mut self,
        owner: AccountId,
        vault: AccountId,
        #[callback_result] result: Result<(), PromiseError>,
    ) -> near_sdk::PromiseOrValue<bool> {
        if result.is_err() {
            self.vaults.remove(&owner);
            self.created_today.1 = self.created_today.1.saturating_sub(1);
            FactoryEvent::VaultCreateFailed { owner, vault }.emit();
            return near_sdk::PromiseOrValue::Value(false);
        }
        near_sdk::PromiseOrValue::Promise(self.register_vault_on_usdc(owner, vault))
    }
}
