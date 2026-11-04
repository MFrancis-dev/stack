//! Unit tests for factory rules. Real account creation is tested in contracts/tests.
use super::*;
use near_sdk::test_utils::VMContextBuilder;
use near_sdk::testing_env;

const DAY: u64 = 86_400 * 1_000_000_000;

fn id(s: &str) -> AccountId {
    s.parse().unwrap()
}

fn ctx(predecessor: &str, input: Vec<u8>, ts: u64) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(id("factory.stack.near"))
        .predecessor_account_id(id(predecessor))
        .account_balance(NearToken::from_near(100))
        .block_timestamp(ts);
    let mut c = b.build();
    c.input = input.into();
    testing_env!(c);
}

fn factory(cap: u32) -> Factory {
    ctx("factory.stack.near", vec![], DAY);
    let mut f = Factory::new(id("admin.near"), id("keeper.stack.near"), id("usdc.near"), cap);
    ctx("admin.near", vec![0, 97, 115, 109], DAY);
    f.set_vault_code();
    f
}

#[test]
#[should_panic(expected = "Only the admin")]
fn only_admin_sets_code() {
    let mut f = factory(5);
    ctx("keeper.stack.near", vec![1, 2, 3], DAY);
    f.set_vault_code();
}

#[test]
fn code_hash_is_exposed() {
    let f = factory(5);
    assert_eq!(f.get_vault_code_hash().unwrap().len(), 64);
}

#[test]
#[should_panic(expected = "Only the keeper")]
fn only_keeper_creates() {
    let mut f = factory(5);
    ctx("alice.near", vec![], DAY);
    let _ = f.create_vault_for(id("alice.near"));
}

#[test]
#[should_panic(expected = "Vault code not set")]
fn needs_code_first() {
    ctx("factory.stack.near", vec![], DAY);
    let mut f = Factory::new(id("admin.near"), id("keeper.stack.near"), id("usdc.near"), 5);
    ctx("keeper.stack.near", vec![], DAY);
    let _ = f.create_vault_for(id("alice.near"));
}

#[test]
#[should_panic(expected = "Vault already exists")]
fn one_vault_per_owner() {
    let mut f = factory(5);
    ctx("keeper.stack.near", vec![], DAY);
    let _ = f.create_vault_for(id("alice.near"));
    let _ = f.create_vault_for(id("alice.near"));
}

#[test]
#[should_panic(expected = "Daily vault cap reached")]
fn daily_cap_enforced() {
    let mut f = factory(2);
    ctx("keeper.stack.near", vec![], DAY);
    let _ = f.create_vault_for(id("a.near"));
    let _ = f.create_vault_for(id("b.near"));
    let _ = f.create_vault_for(id("c.near"));
}

#[test]
fn daily_cap_resets_next_day() {
    let mut f = factory(1);
    ctx("keeper.stack.near", vec![], DAY);
    let _ = f.create_vault_for(id("a.near"));
    ctx("keeper.stack.near", vec![], 2 * DAY);
    let _ = f.create_vault_for(id("b.near"));
    assert!(f.get_vault(id("b.near")).is_some());
}

#[test]
fn vault_ids_are_short_and_deterministic() {
    let f = factory(5);
    let long_owner = id("0000000000000000000000000000000000000000000000000000000000000abc");
    let v = f.vault_account_for(&long_owner);
    assert!(v.as_str().starts_with('v'));
    assert!(v.as_str().ends_with(".factory.stack.near"));
    assert_eq!(v.as_str().split('.').next().unwrap().len(), 17);
    assert_eq!(v, f.vault_account_for(&long_owner));
}

#[test]
fn failed_deploy_rolls_back() {
    let mut f = factory(1);
    ctx("keeper.stack.near", vec![], DAY);
    let _ = f.create_vault_for(id("a.near"));
    let vault = f.get_vault(id("a.near")).unwrap();
    ctx("factory.stack.near", vec![], DAY);
    let _ = f.on_vault_deployed(id("a.near"), vault, Err(near_sdk::PromiseError::Failed));
    assert!(f.get_vault(id("a.near")).is_none());
    // slot returned: another vault fits under cap 1
    ctx("keeper.stack.near", vec![], DAY);
    let _ = f.create_vault_for(id("b.near"));
}
