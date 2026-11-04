//! Factory behaviour on a real sandbox. Roadmap: K1.10
use crate::setup::*;
use serde_json::json;

#[tokio::test]
async fn vault_is_created_and_registered_on_usdc() -> anyhow::Result<()> {
    let env = setup().await?;
    let reg: serde_json::Value = env
        .usdc
        .view("storage_balance_of")
        .args_json(json!({ "account_id": env.vault_id }))
        .await?
        .json()?;
    assert_ne!(reg, json!(null), "vault must be registered on USDC (no refund otherwise)");
    assert!(env.vault_id.as_str().ends_with(env.factory.id().as_str()));
    Ok(())
}

#[tokio::test]
async fn one_vault_per_owner() -> anyhow::Result<()> {
    let env = setup().await?;
    let r = env
        .keeper
        .call(env.factory.id(), "create_vault_for")
        .args_json(json!({ "owner": env.alice.id() }))
        .gas(TGAS_300)
        .transact()
        .await?;
    assert!(r.is_failure());
    Ok(())
}

#[tokio::test]
async fn only_keeper_creates() -> anyhow::Result<()> {
    let env = setup().await?;
    let r = env
        .alice
        .call(env.factory.id(), "create_vault_for")
        .args_json(json!({ "owner": env.funder.id() }))
        .gas(TGAS_300)
        .transact()
        .await?;
    assert!(r.is_failure());
    Ok(())
}
