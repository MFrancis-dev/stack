//! Buy edge cases. Roadmap: K1.10
use crate::setup::*;
use serde_json::json;

#[tokio::test]
async fn registers_deposit_address_before_transfer() -> anyhow::Result<()> {
    let env = setup().await?;
    env.fund_vault(500_000_000).await?;
    env.set_plan_and_resume(PER_RUN).await?;
    let dep = env.deposit_account("dep1").await?;
    let before: serde_json::Value = env
        .usdc
        .view("storage_balance_of")
        .args_json(json!({ "account_id": dep.id() }))
        .await?
        .json()?;
    assert_eq!(before, json!(null));

    assert_ok(&env.buy("q1", dep.id(), PER_RUN, STORAGE_FOR_DEPOSIT_ADDR).await?);
    let after: serde_json::Value = env
        .usdc
        .view("storage_balance_of")
        .args_json(json!({ "account_id": dep.id() }))
        .await?
        .json()?;
    assert_ne!(after, json!(null));
    assert_eq!(balance(&env.usdc, dep.id()).await?, PER_RUN);
    Ok(())
}

#[tokio::test]
async fn insufficient_balance_fails_cleanly() -> anyhow::Result<()> {
    let env = setup().await?;
    env.fund_vault(50_000_000).await?; // less than one run
    env.set_plan_and_resume(PER_RUN).await?;
    let dep = env.deposit_account("dep1").await?;

    let r = env.buy("q1", dep.id(), PER_RUN, STORAGE_FOR_DEPOSIT_ADDR).await?;
    assert!(logs_contain(&r, "\"event\":\"buy_failed\""), "logs: {:?}", r.logs());
    assert_eq!(env.state().await?["last_run_at_s"], json!(0));
    assert_eq!(balance(&env.usdc, &env.vault_id).await?, 50_000_000);
    Ok(())
}
