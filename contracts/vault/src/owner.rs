//! Owner-only fund movements. Roadmap: K1.5 · Invariants: I1, I4
use crate::*;
use near_sdk::Promise;

#[near]
impl Vault {
    /// Owner + 1 yocto. Sends USDC to the owner.
    #[payable]
    pub fn withdraw(&mut self, amount: U128) -> Promise {
        near_sdk::assert_one_yocto();
        self.assert_owner();
        let _ = amount;
        todo!("K1.5")
    }

    /// Owner + 1 yocto. Sends any other NEP-141 token held by the vault to the owner.
    #[payable]
    pub fn recover_token(&mut self, token: AccountId, amount: U128) -> Promise {
        near_sdk::assert_one_yocto();
        self.assert_owner();
        let _ = (token, amount);
        todo!("K1.5")
    }
}
