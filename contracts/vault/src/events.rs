//! NEP-297 events, one per state change. Roadmap: K1.6
//! 🔍 Confirm the near-sdk 5 event macro syntax when implementing.

#[allow(dead_code)]
pub(crate) enum VaultEvent {
    Deposited,
    PlanUpdated,
    Paused,
    Resumed,
    BuySent,
    BuyFailed,
    Withdrawn,
    TokenRecovered,
}
