//! Owner fund movements. Roadmap: K1.10
use crate::setup::*;
use near_workspaces::types::NearToken;
use serde_json::json;

#[tokio::test]
async fn withdraw_sends_to_owner_even_when_paused() -> anyhow::Result<()> {
    let env = setup().await?;
    env.fund_vault(250_000_000).await?;
    let r = env
        .alice
        .call(&env.vault_id, "withdraw")
        .args_json(json!({ "amount": "250000000" }))
        .deposit(NearToken::from_yoctonear(1))
        .max_gas()
        .transact()
        .await?;
    assert_ok(&r);
    assert!(logs_contain(&r, "\"event\":\"withdrawn\""));
    assert_eq!(balance(&env.usdc, env.alice.id()).await?, 250_000_000);
    Ok(())
}

#[tokio::test]
async fn non_owner_rejected() -> anyhow::Result<()> {
    let env = setup().await?;
    let r = env
        .funder
        .call(&env.vault_id, "set_plan")
        .args_json(json!({ "target_asset": "a", "destination_address": "b", "amount_per_run": "1", "interval_s": 3600, "max_cost_bps": 100 }))
        .deposit(NearToken::from_yoctonear(1))
        .transact()
        .await?;
    assert!(r.is_failure());
    assert!(env.funder.call(&env.vault_id, "pause").transact().await?.is_failure());
    Ok(())
}
