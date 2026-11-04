//! Unit tests for vault rules. Cross-contract flows live in contracts/tests (near-workspaces).
use super::*;
use near_sdk::test_utils::{get_logs, VMContextBuilder};
use near_sdk::{testing_env, PromiseError};

const SEC: u64 = 1_000_000_000;

fn owner() -> AccountId {
    "alice.near".parse().unwrap()
}
fn keeper() -> AccountId {
    "keeper.stack.near".parse().unwrap()
}
fn usdc() -> AccountId {
    "usdc.near".parse().unwrap()
}
fn vault_id() -> AccountId {
    "v0123456789abcdef.factory.stack.near".parse().unwrap()
}
fn deposit_addr() -> AccountId {
    "0000000000000000000000000000000000000000000000000000000000000abc".parse().unwrap()
}

fn ctx(predecessor: AccountId, deposit: u128, now_s: u64) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(vault_id())
        .predecessor_account_id(predecessor)
        .attached_deposit(NearToken::from_yoctonear(deposit))
        .block_timestamp(now_s * SEC);
    testing_env!(b.build());
}

fn new_vault() -> Vault {
    ctx("factory.stack.near".parse().unwrap(), 0, 1_000);
    Vault::new(owner(), keeper(), usdc())
}

fn planned_vault() -> Vault {
    let mut v = new_vault();
    ctx(owner(), 1, 1_000);
    v.set_plan("nep141:btc.omft.near".into(), "bc1qexample".into(), U128(100_000_000), 3_600, 300);
    ctx(owner(), 1, 1_000);
    v.resume();
    v
}

// ---- I7: new vault is paused, without a plan ----
#[test]
fn i7_new_vault_is_paused_without_plan() {
    let v = new_vault();
    let s = v.get_state();
    assert!(s.paused);
    assert_eq!(s.target_asset, None);
    assert_eq!(s.destination_address, None);
    assert_eq!(s.next_run_at_s, None);
}

// ---- I4: owner + 1 yocto, pause without deposit ----
#[test]
#[should_panic(expected = "Requires attached deposit of exactly 1 yoctoNEAR")]
fn set_plan_requires_one_yocto() {
    let mut v = new_vault();
    ctx(owner(), 0, 1_000);
    v.set_plan("a".into(), "b".into(), U128(1), 3_600, 100);
}

#[test]
#[should_panic(expected = "Only the owner")]
fn set_plan_rejects_non_owner() {
    let mut v = new_vault();
    ctx(keeper(), 1, 1_000);
    v.set_plan("a".into(), "b".into(), U128(1), 3_600, 100);
}

#[test]
#[should_panic(expected = "Only the owner")]
fn resume_rejects_keeper() {
    let mut v = new_vault();
    ctx(keeper(), 1, 1_000);
    v.resume();
}

#[test]
#[should_panic(expected = "Set a plan first")]
fn resume_requires_plan() {
    let mut v = new_vault();
    ctx(owner(), 1, 1_000);
    v.resume();
}

#[test]
fn pause_needs_no_deposit_and_emits_event() {
    let mut v = planned_vault();
    ctx(owner(), 0, 1_000);
    v.pause();
    assert!(v.get_state().paused);
    assert!(get_logs().iter().any(|l| l.contains("\"event\":\"paused\"")));
}

#[test]
#[should_panic(expected = "Only the owner")]
fn keeper_cannot_pause() {
    let mut v = planned_vault();
    ctx(keeper(), 0, 1_000);
    v.pause();
}

#[test]
#[should_panic(expected = "Requires attached deposit of exactly 1 yoctoNEAR")]
fn withdraw_requires_one_yocto() {
    let mut v = planned_vault();
    ctx(owner(), 0, 1_000);
    let _ = v.withdraw(U128(1));
}

#[test]
#[should_panic(expected = "Only the owner")]
fn keeper_cannot_withdraw() {
    let mut v = planned_vault();
    ctx(keeper(), 1, 1_000);
    let _ = v.withdraw(U128(1));
}

#[test]
#[should_panic(expected = "Use withdraw for USDC")]
fn recover_token_refuses_usdc() {
    let mut v = planned_vault();
    ctx(owner(), 1, 1_000);
    let _ = v.recover_token(usdc(), U128(1));
}

// ---- plan validation ----
#[test]
#[should_panic(expected = "interval_s too short")]
fn plan_rejects_short_interval() {
    let mut v = new_vault();
    ctx(owner(), 1, 1_000);
    v.set_plan("a".into(), "b".into(), U128(1), MIN_INTERVAL_S - 1, 100);
}

#[test]
#[should_panic(expected = "max_cost_bps out of range")]
fn plan_rejects_cost_above_cap() {
    let mut v = new_vault();
    ctx(owner(), 1, 1_000);
    v.set_plan("a".into(), "b".into(), U128(1), 3_600, MAX_COST_BPS + 1);
}

#[test]
#[should_panic(expected = "amount_per_run must be positive")]
fn plan_rejects_zero_amount() {
    let mut v = new_vault();
    ctx(owner(), 1, 1_000);
    v.set_plan("a".into(), "b".into(), U128(0), 3_600, 100);
}

#[test]
fn set_plan_keeps_vault_paused_and_emits_event() {
    let mut v = new_vault();
    ctx(owner(), 1, 1_000);
    v.set_plan("nep141:eth.omft.near".into(), "0xabc".into(), U128(5), 3_600, 100);
    let s = v.get_state();
    assert!(s.paused, "set_plan must not unpause");
    assert_eq!(s.amount_per_run, U128(5));
    assert!(get_logs().iter().any(|l| l.contains("\"event\":\"plan_updated\"")));
}

// ---- I2 / I3: bounded buys ----
#[test]
#[should_panic(expected = "Only the keeper")]
fn owner_cannot_execute_buy() {
    let mut v = planned_vault();
    ctx(owner(), 0, 10_000);
    let _ = v.execute_buy("q1".into(), deposit_addr(), U128(1));
}

#[test]
#[should_panic(expected = "Vault is paused")]
fn i3_no_buy_when_paused() {
    let mut v = planned_vault();
    ctx(owner(), 0, 1_000);
    v.pause();
    ctx(keeper(), 0, 10_000);
    let _ = v.execute_buy("q1".into(), deposit_addr(), U128(1));
}

#[test]
#[should_panic(expected = "No plan")]
fn i3_no_buy_without_plan() {
    let mut v = new_vault();
    v.paused = false; // force: a plan-less vault must still refuse
    ctx(keeper(), 0, 10_000);
    let _ = v.execute_buy("q1".into(), deposit_addr(), U128(1));
}

#[test]
#[should_panic(expected = "Amount above amount_per_run")]
fn i2_amount_capped() {
    let mut v = planned_vault();
    ctx(keeper(), 0, 10_000);
    let _ = v.execute_buy("q1".into(), deposit_addr(), U128(100_000_001));
}

#[test]
#[should_panic(expected = "Too early for the next buy")]
fn i2_one_buy_per_interval() {
    let mut v = planned_vault();
    ctx(keeper(), 0, 10_000);
    let _ = v.execute_buy("q1".into(), deposit_addr(), U128(1));
    ctx(keeper(), 0, 10_000 + 3_599);
    let _ = v.execute_buy("q2".into(), deposit_addr(), U128(1));
}

#[test]
fn buy_allowed_again_after_interval() {
    let mut v = planned_vault();
    ctx(keeper(), 0, 10_000);
    let _ = v.execute_buy("q1".into(), deposit_addr(), U128(1));
    ctx(keeper(), 0, 10_000 + 3_600);
    let _ = v.execute_buy("q2".into(), deposit_addr(), U128(1));
    assert_eq!(v.get_state().last_run_at_s, 13_600);
}

// ---- I6: failed transfer restores the schedule ----
#[test]
fn i6_failed_transfer_restores_last_run() {
    let mut v = planned_vault();
    ctx(keeper(), 0, 10_000);
    let _ = v.execute_buy("q1".into(), deposit_addr(), U128(1));
    assert_eq!(v.last_run_at_s, 10_000);
    ctx(vault_id(), 0, 10_001);
    let ok = v.on_buy_transfer("q1".into(), deposit_addr(), U128(1), 0, Err(PromiseError::Failed));
    assert!(!ok);
    assert_eq!(v.last_run_at_s, 0);
    assert!(get_logs().iter().any(|l| l.contains("\"event\":\"buy_failed\"")));
}

#[test]
fn successful_transfer_keeps_last_run_and_emits_buy_sent() {
    let mut v = planned_vault();
    ctx(keeper(), 0, 10_000);
    let _ = v.execute_buy("q1".into(), deposit_addr(), U128(1));
    ctx(vault_id(), 0, 10_001);
    assert!(v.on_buy_transfer("q1".into(), deposit_addr(), U128(1), 0, Ok(())));
    assert_eq!(v.last_run_at_s, 10_000);
    assert!(get_logs().iter().any(|l| l.contains("\"event\":\"buy_sent\"")));
}

// `#[private]` is enforced in the wasm entry point, not on direct Rust calls; covered by the
// near-workspaces test `callbacks_are_private` instead.

#[test]
fn next_run_reported_when_active() {
    let v = planned_vault();
    assert_eq!(v.get_state().next_run_at_s, Some(3_600));
}

#[test]
fn ft_on_transfer_keeps_everything() {
    let mut v = planned_vault();
    ctx(usdc(), 0, 1_000);
    match v.ft_on_transfer(owner(), U128(50), String::new()) {
        near_sdk::PromiseOrValue::Value(U128(0)) => {}
        _ => panic!("must keep all tokens"),
    }
    assert!(get_logs().iter().any(|l| l.contains("\"event\":\"deposited\"")));
}
