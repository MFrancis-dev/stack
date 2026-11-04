//! NEP-297 events, one per state change. Roadmap: K1.6
use near_sdk::json_types::U128;
use near_sdk::{near, AccountId};

#[near(event_json(standard = "stack_vault"))]
pub enum VaultEvent {
    #[event_version("1.0.0")]
    Deposited { token: AccountId, sender_id: AccountId, amount: U128 },
    #[event_version("1.0.0")]
    PlanUpdated {
        target_asset: String,
        destination_address: String,
        amount_per_run: U128,
        interval_s: u64,
        max_cost_bps: u16,
    },
    #[event_version("1.0.0")]
    Paused,
    #[event_version("1.0.0")]
    Resumed,
    #[event_version("1.0.0")]
    BuySent { quote_ref: String, deposit_address: AccountId, amount: U128 },
    #[event_version("1.0.0")]
    BuyFailed { quote_ref: String, deposit_address: AccountId, amount: U128 },
    #[event_version("1.0.0")]
    Withdrawn { amount: U128 },
    #[event_version("1.0.0")]
    WithdrawFailed { amount: U128 },
    #[event_version("1.0.0")]
    TokenRecovered { token: AccountId, amount: U128 },
}
