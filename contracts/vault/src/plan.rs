//! Owner plan controls. Roadmap: K1.2
use crate::*;

#[near]
impl Vault {
    /// Owner + 1 yocto (I4). Validates ranges, stores the plan, emits `plan_updated`.
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
        let _ = (target_asset, destination_address, amount_per_run, interval_s, max_cost_bps);
        todo!("K1.2")
    }

    /// Owner + 1 yocto (I4). Requires a complete plan.
    #[payable]
    pub fn resume(&mut self) {
        near_sdk::assert_one_yocto();
        self.assert_owner();
        require!(self.has_plan(), "Set a plan first");
        todo!("K1.2: unpause + emit `resumed`")
    }

    /// Owner only, no deposit: pausing must always be the easiest call (I4).
    pub fn pause(&mut self) {
        self.assert_owner();
        self.paused = true;
        // TODO(K1.6): emit `paused`
    }
}
