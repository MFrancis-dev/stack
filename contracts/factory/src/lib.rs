//! Stack factory: creates one vault per owner (keeper only), pays storage.
//! Spec: ARCHITECTURE.md §3.2 · Roadmap: K1.7
//! Status: scaffold — state is final-draft, methods are stubs.

use near_sdk::store::LookupMap;
use near_sdk::{env, near, require, AccountId, BorshStorageKey, PanicOnDefault, Promise};

mod deploy;
mod storage;

#[near]
#[derive(BorshStorageKey)]
enum StorageKey {
    Vaults,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Factory {
    /// Can publish new vault code only. No path to vault funds (I5).
    admin: AccountId,
    keeper: AccountId,
    usdc: AccountId,
    /// Global contract hash if available (🔍 K0.12), else embedded wasm.
    vault_code_hash: Option<String>,
    vaults: LookupMap<AccountId, AccountId>,
    /// (day number, vaults created that day)
    created_today: (u64, u32),
    daily_cap: u32,
}

#[near]
impl Factory {
    #[init]
    pub fn new(admin: AccountId, keeper: AccountId, usdc: AccountId, daily_cap: u32) -> Self {
        Self {
            admin,
            keeper,
            usdc,
            vault_code_hash: None,
            vaults: LookupMap::new(StorageKey::Vaults),
            created_today: (0, 0),
            daily_cap,
        }
    }

    /// Keeper only · one vault per owner · daily cap. Creates `v<sha256(owner)[0..16]>.<factory>`,
    /// deploys vault code, calls `new(owner, keeper, usdc)`, registers USDC storage for the vault.
    #[payable]
    pub fn create_vault_for(&mut self, owner: AccountId) -> Promise {
        require!(env::predecessor_account_id() == self.keeper, "Only the keeper");
        require!(self.vaults.get(&owner).is_none(), "Vault already exists");
        todo!("K1.7")
    }

    pub fn get_vault(&self, owner: AccountId) -> Option<AccountId> {
        self.vaults.get(&owner).cloned()
    }
}
