//! Owner plan controls. Roadmap: K1.2 · Invariants: I3, I4
use crate::*;

#[near]
impl Vault {
    /// Owner + 1 yocto (I4). Validates ranges and stores the plan. Does not unpause.
    #[payable]
    pub fn set_plan(
        &mut self,
        target_asset: String,
        destination_address: String,
        amount_per_run: U128,
        interval_s: u64,
        max_cost_bps: Bps,
    ) {
        near_sdk::assert_one_yocto();
        self.assert_owner();
        require!(
            !target_asset.is_empty() && target_asset.len() <= MAX_FIELD_LEN,
            "Invalid target_asset"
        );
        require!(
            !destination_address.is_empty() && destination_address.len() <= MAX_FIELD_LEN,
            "Invalid destination_address"
        );
        require!(amount_per_run.0 > 0, "amount_per_run must be positive");
        require!(interval_s >= MIN_INTERVAL_S, "interval_s too short");
        require!(
            max_cost_bps > 0 && max_cost_bps <= MAX_COST_BPS,
            "max_cost_bps out of range"
        );

        self.target_asset = Some(target_asset.clone());
        self.destination_address = Some(destination_address.clone());
        self.amount_per_run = amount_per_run.0;
        self.interval_s = interval_s;
        self.max_cost_bps = max_cost_bps;

        VaultEvent::PlanUpdated {
            target_asset,
            destination_address,
            amount_per_run,
            interval_s,
            max_cost_bps,
        }
        .emit();
    }

    /// Owner + 1 yocto (I4). Requires a complete plan.
    #[payable]
    pub fn resume(&mut self) {
        near_sdk::assert_one_yocto();
        self.assert_owner();
        require!(self.has_plan(), "Set a plan first");
        self.paused = false;
        VaultEvent::Resumed.emit();
    }

    /// Owner only, no deposit: pausing must always be the easiest call (I4).
    pub fn pause(&mut self) {
        self.assert_owner();
        self.paused = true;
        VaultEvent::Paused.emit();
    }
}
