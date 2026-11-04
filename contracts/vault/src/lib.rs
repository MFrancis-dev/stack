//! Stack vault: holds one owner's USDC and makes bounded scheduled buys.
//! Spec: ARCHITECTURE.md §3.3–3.6 · Roadmap: K1.1–K1.6
//! Status: scaffold — state is final-draft, methods are stubs.

use near_sdk::json_types::U128;
use near_sdk::{env, near, require, AccountId, PanicOnDefault};

mod buy;
mod events;
mod ft;
mod owner;
mod plan;
mod receive;

/// Basis points (1/100 of a percent).
pub type Bps = u16;

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
        todo!("K1.1: build VaultView incl. next_run_at_s")
    }
}

impl Vault {
    #[allow(dead_code)] // used by get_state / execute_buy (K1.1, K1.4)
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
