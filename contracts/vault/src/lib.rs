//! Stack vault: holds one owner's USDC and makes bounded scheduled buys.
//! Spec: ARCHITECTURE.md §3.3–3.6 · Roadmap: K1.1–K1.6
//!
//! Funds can leave only through `withdraw` (to the owner), `recover_token` (to the owner)
//! or `execute_buy` (keeper, at most `amount_per_run` once per `interval_s`). There is no
//! admin and no upgrade path (KD-5).

use near_sdk::json_types::U128;
use near_sdk::{env, near, require, AccountId, Gas, NearToken, PanicOnDefault};

mod buy;
mod events;
mod ft;
mod owner;
mod plan;
mod receive;

#[cfg(test)]
mod tests;

pub use events::VaultEvent;

/// Basis points (1/100 of a percent).
pub type Bps = u16;

/// Gas for a NEP-141 `ft_transfer` (the 1Click SDK documents 15 TGas as the minimum).
pub(crate) const GAS_FT_TRANSFER: Gas = Gas::from_tgas(15);
/// Gas for a NEP-145 `storage_deposit`.
pub(crate) const GAS_STORAGE_DEPOSIT: Gas = Gas::from_tgas(10);
/// Gas reserved for our own callbacks.
pub(crate) const GAS_CALLBACK: Gas = Gas::from_tgas(10);
pub(crate) const ONE_YOCTO: NearToken = NearToken::from_yoctonear(1);

/// Plan limits enforced on-chain.
pub(crate) const MIN_INTERVAL_S: u64 = 60;
pub(crate) const MAX_COST_BPS: Bps = 5_000;
pub(crate) const MAX_FIELD_LEN: usize = 128;

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Vault {
    pub(crate) owner: AccountId,
    pub(crate) keeper: AccountId,
    pub(crate) usdc: AccountId,
    /// 1Click asset id of what we buy (e.g. BTC). None until the owner sets a plan.
    pub(crate) target_asset: Option<String>,
    /// Owner's address on the target chain. None until the owner sets a plan.
    pub(crate) destination_address: Option<String>,
    /// USDC base units per buy.
    pub(crate) amount_per_run: u128,
    pub(crate) interval_s: u64,
    pub(crate) max_cost_bps: Bps,
    /// True at creation (I7).
    pub(crate) paused: bool,
    pub(crate) last_run_at_s: u64,
}

/// What `get_state` returns to the app and worker.
#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct VaultView {
    pub owner: AccountId,
    pub keeper: AccountId,
    pub usdc: AccountId,
    pub target_asset: Option<String>,
    pub destination_address: Option<String>,
    pub amount_per_run: U128,
    pub interval_s: u64,
    pub max_cost_bps: Bps,
    pub paused: bool,
    pub last_run_at_s: u64,
    /// None while paused or without a plan.
    pub next_run_at_s: Option<u64>,
}

#[near]
impl Vault {
    /// Called by the factory. A new vault is paused with no plan (I7).
    #[init]
    pub fn new(owner: AccountId, keeper: AccountId, usdc: AccountId) -> Self {
        Self {
            owner,
            keeper,
            usdc,
            target_asset: None,
            destination_address: None,
            amount_per_run: 0,
            interval_s: 0,
            max_cost_bps: 0,
            paused: true,
            last_run_at_s: 0,
        }
    }

    pub fn get_state(&self) -> VaultView {
        let next_run_at_s = if self.paused || !self.has_plan() {
            None
        } else {
            Some(self.last_run_at_s.saturating_add(self.interval_s))
        };
        VaultView {
            owner: self.owner.clone(),
            keeper: self.keeper.clone(),
            usdc: self.usdc.clone(),
            target_asset: self.target_asset.clone(),
            destination_address: self.destination_address.clone(),
            amount_per_run: U128(self.amount_per_run),
            interval_s: self.interval_s,
            max_cost_bps: self.max_cost_bps,
            paused: self.paused,
            last_run_at_s: self.last_run_at_s,
            next_run_at_s,
        }
    }
}

impl Vault {
    pub(crate) fn now_s() -> u64 {
        env::block_timestamp() / 1_000_000_000
    }

    pub(crate) fn assert_owner(&self) {
        require!(env::predecessor_account_id() == self.owner, "Only the owner");
    }

    pub(crate) fn assert_keeper(&self) {
        require!(env::predecessor_account_id() == self.keeper, "Only the keeper");
    }

    pub(crate) fn has_plan(&self) -> bool {
        self.target_asset.is_some()
            && self.destination_address.is_some()
            && self.amount_per_run > 0
            && self.interval_s > 0
    }
}
