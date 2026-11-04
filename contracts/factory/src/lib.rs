//! Stack factory: creates one vault per owner (keeper only, daily cap) and pays its storage.
//! Spec: ARCHITECTURE.md §3.2 · Roadmap: K1.7 · Decision KD-8 (regular deploy)
//!
//! The admin uploads the vault wasm once (`set_vault_code`). Uploading new code only affects
//! vaults created afterwards; existing vaults are immutable (KD-5). The factory has no path to
//! any vault's funds (I5).

use near_sdk::store::{LazyOption, LookupMap};
use near_sdk::{env, near, require, AccountId, BorshStorageKey, Gas, NearToken, PanicOnDefault, Promise};

mod deploy;
mod storage;

#[cfg(test)]
mod tests;

pub(crate) const GAS_VAULT_INIT: Gas = Gas::from_tgas(20);
pub(crate) const GAS_STORAGE_DEPOSIT: Gas = Gas::from_tgas(10);
pub(crate) const GAS_CALLBACK: Gas = Gas::from_tgas(20);
/// Extra balance for the vault's own state and the 1-yocto deposits its transfers attach.
pub(crate) const VAULT_BALANCE_BUFFER: NearToken = NearToken::from_millinear(100);
/// NEP-145 deposit for registering the vault on USDC; `registration_only` refunds the excess.
pub(crate) const USDC_STORAGE_DEPOSIT: NearToken = NearToken::from_millinear(13);
pub(crate) const SECONDS_PER_DAY: u64 = 86_400;

#[near]
#[derive(BorshStorageKey)]
enum StorageKey {
    Vaults,
    VaultCode,
}

#[near(event_json(standard = "stack_factory"))]
pub enum FactoryEvent {
    #[event_version("1.0.0")]
    VaultCodeUpdated { sha256: String, size: u64 },
    #[event_version("1.0.0")]
    VaultCreated { owner: AccountId, vault: AccountId },
    #[event_version("1.0.0")]
    VaultCreateFailed { owner: AccountId, vault: AccountId },
    #[event_version("1.0.0")]
    VaultRegistrationFailed { owner: AccountId, vault: AccountId },
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Factory {
    /// Can upload vault code for future vaults only. No path to vault funds (I5).
    admin: AccountId,
    keeper: AccountId,
    usdc: AccountId,
    vault_code: LazyOption<Vec<u8>>,
    vaults: LookupMap<AccountId, AccountId>,
    /// (day number, vaults created that day)
    created_today: (u64, u32),
    daily_cap: u32,
}

#[near]
impl Factory {
    #[init]
    pub fn new(admin: AccountId, keeper: AccountId, usdc: AccountId, daily_cap: u32) -> Self {
        require!(daily_cap > 0, "daily_cap must be positive");
        Self {
            admin,
            keeper,
            usdc,
            vault_code: LazyOption::new(StorageKey::VaultCode, None),
            vaults: LookupMap::new(StorageKey::Vaults),
            created_today: (0, 0),
            daily_cap,
        }
    }

    /// Admin only. The raw vault wasm is the call's input (not JSON), e.g.
    /// `near contract call-function as-transaction <factory> set_vault_code file-args vault.wasm …`.
    pub fn set_vault_code(&mut self) {
        require!(env::predecessor_account_id() == self.admin, "Only the admin");
        let code = env::input().unwrap_or_default();
        require!(!code.is_empty(), "Empty code");
        let sha256 = hex(&env::sha256(&code));
        let size = code.len() as u64;
        self.vault_code.set(Some(code));
        FactoryEvent::VaultCodeUpdated { sha256, size }.emit();
    }

    /// Keeper only · one vault per owner · daily cap. The factory pays for the account,
    /// code storage and USDC registration. A new vault is paused with no plan.
    pub fn create_vault_for(&mut self, owner: AccountId) -> Promise {
        require!(env::predecessor_account_id() == self.keeper, "Only the keeper");
        require!(self.vaults.get(&owner).is_none(), "Vault already exists");
        require!(self.vault_code.get().is_some(), "Vault code not set");

        let day = env::block_timestamp() / 1_000_000_000 / SECONDS_PER_DAY;
        if self.created_today.0 != day {
            self.created_today = (day, 0);
        }
        require!(self.created_today.1 < self.daily_cap, "Daily vault cap reached");
        self.created_today.1 += 1;

        let vault = self.vault_account_for(&owner);
        self.vaults.insert(owner.clone(), vault.clone());
        self.deploy_vault(owner, vault)
    }

    pub fn get_vault(&self, owner: AccountId) -> Option<AccountId> {
        self.vaults.get(&owner).cloned()
    }

    /// sha256 (hex) of the code new vaults get, so anyone can compare it with a vault's code hash.
    pub fn get_vault_code_hash(&self) -> Option<String> {
        self.vault_code.get().as_ref().map(|c| hex(&env::sha256(c)))
    }

    pub fn get_config(&self) -> (AccountId, AccountId, AccountId, u32) {
        (self.admin.clone(), self.keeper.clone(), self.usdc.clone(), self.daily_cap)
    }
}

impl Factory {
    /// `v<first 16 hex chars of sha256(owner)>.<factory>` — short enough for any owner id.
    pub(crate) fn vault_account_for(&self, owner: &AccountId) -> AccountId {
        let digest = hex(&env::sha256(owner.as_bytes()));
        format!("v{}.{}", &digest[..16], env::current_account_id())
            .parse()
            .unwrap_or_else(|_| env::panic_str("Invalid vault account id"))
    }
}

pub(crate) fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}
