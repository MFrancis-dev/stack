//! One test per invariant I1–I7 (ARCHITECTURE.md §3.4), on a local sandbox. Roadmap: K1.9
use crate::setup::*;
use near_workspaces::types::NearToken;
use serde_json::json;

#[tokio::test]
async fn i1_usdc_leaves_only_to_owner_or_bounded_buy() -> anyhow::Result<()> {
    let env = setup().await?;
    env.fund_vault(500_000_000).await?;
    env.set_plan_and_resume(PER_RUN).await?;
    let dep = env.deposit_account("dep1").await?;

    // Bounded buy: exactly amount moves to the deposit address.
    let r = env.buy("q1", dep.id(), PER_RUN, STORAGE_FOR_DEPOSIT_ADDR).await?;
    assert_ok(&r);
    assert!(logs_contain(&r, "\"event\":\"buy_sent\""));
    assert_eq!(balance(&env.usdc, dep.id()).await?, PER_RUN);

    // Owner withdraw: the rest goes to alice and nowhere else.
    let r = env
        .alice
        .call(&env.vault_id, "withdraw")
        .args_json(json!({ "amount": "400000000" }))
        .deposit(NearToken::from_yoctonear(1))
        .max_gas()
        .transact()
        .await?;
    assert_ok(&r);
    assert_eq!(balance(&env.usdc, env.alice.id()).await?, 400_000_000);
    assert_eq!(balance(&env.usdc, &env.vault_id).await?, 0);
    Ok(())
}

#[tokio::test]
async fn i2_one_buy_per_interval_within_amount() -> anyhow::Result<()> {
    let env = setup().await?;
    env.fund_vault(500_000_000).await?;
    env.set_plan_and_resume(PER_RUN).await?;
    let dep = env.deposit_account("dep1").await?;

    let too_big = env.buy("q0", dep.id(), PER_RUN + 1, STORAGE_FOR_DEPOSIT_ADDR).await?;
    assert!(too_big.is_failure());

    assert_ok(&env.buy("q1", dep.id(), PER_RUN, STORAGE_FOR_DEPOSIT_ADDR).await?);
    let again = env.buy("q2", dep.id(), PER_RUN, NearToken::from_yoctonear(0)).await?;
    assert!(again.is_failure(), "second buy in the same interval must fail");
    assert_eq!(balance(&env.usdc, dep.id()).await?, PER_RUN);
    Ok(())
}

#[tokio::test]
async fn i3_no_buy_when_paused_or_without_plan() -> anyhow::Result<()> {
    let env = setup().await?;
    env.fund_vault(500_000_000).await?;
    let dep = env.deposit_account("dep1").await?;

    // No plan yet (and paused at creation).
    assert!(env.buy("q1", dep.id(), 1, STORAGE_FOR_DEPOSIT_ADDR).await?.is_failure());

    env.set_plan_and_resume(PER_RUN).await?;
    assert_ok(&env.alice.call(&env.vault_id, "pause").transact().await?);
    assert!(env.buy("q2", dep.id(), 1, STORAGE_FOR_DEPOSIT_ADDR).await?.is_failure());
    assert_eq!(balance(&env.usdc, dep.id()).await?, 0);
    Ok(())
}

#[tokio::test]
async fn i4_owner_methods_need_one_yocto_except_pause() -> anyhow::Result<()> {
    let env = setup().await?;
    let no_yocto = env
        .alice
        .call(&env.vault_id, "set_plan")
        .args_json(json!({ "target_asset": "a", "destination_address": "b", "amount_per_run": "1", "interval_s": 3600, "max_cost_bps": 100 }))
        .transact()
        .await?;
    assert!(no_yocto.is_failure());
    assert!(env.alice.call(&env.vault_id, "resume").transact().await?.is_failure());
    assert!(env
        .alice
        .call(&env.vault_id, "withdraw")
        .args_json(json!({ "amount": "1" }))
        .transact()
        .await?
        .is_failure());
    assert_ok(&env.alice.call(&env.vault_id, "pause").transact().await?);
    Ok(())
}

#[tokio::test]
async fn i5_admin_and_keeper_cannot_take_funds() -> anyhow::Result<()> {
    let env = setup().await?;
    env.fund_vault(500_000_000).await?;
    for who in [&env.admin, &env.keeper] {
        let r = who
            .call(&env.vault_id, "withdraw")
            .args_json(json!({ "amount": "1" }))
            .deposit(NearToken::from_yoctonear(1))
            .max_gas()
            .transact()
            .await?;
        assert!(r.is_failure(), "{} must not withdraw", who.id());
        let r = who
            .call(&env.vault_id, "recover_token")
            .args_json(json!({ "token": env.usdc.id(), "amount": "1" }))
            .deposit(NearToken::from_yoctonear(1))
            .max_gas()
            .transact()
            .await?;
        assert!(r.is_failure());
    }
    assert_eq!(balance(&env.usdc, &env.vault_id).await?, 500_000_000);
    Ok(())
}

#[tokio::test]
async fn i6_failed_transfer_keeps_vault_runnable() -> anyhow::Result<()> {
    let env = setup().await?;
    env.fund_vault(500_000_000).await?;
    env.set_plan_and_resume(PER_RUN).await?;
    let dep = env.deposit_account("dep1").await?;

    // No storage deposit attached + unregistered receiver → ft_transfer fails.
    let r = env.buy("q1", dep.id(), PER_RUN, NearToken::from_yoctonear(0)).await?;
    assert!(logs_contain(&r, "\"event\":\"buy_failed\""), "logs: {:?}", r.logs());
    assert_eq!(env.state().await?["last_run_at_s"], json!(0));
    assert_eq!(balance(&env.usdc, &env.vault_id).await?, 500_000_000);

    // Same interval, now with registration: allowed because the schedule was restored.
    assert_ok(&env.buy("q2", dep.id(), PER_RUN, STORAGE_FOR_DEPOSIT_ADDR).await?);
    assert_eq!(balance(&env.usdc, dep.id()).await?, PER_RUN);
    Ok(())
}

#[tokio::test]
async fn i7_new_vault_is_paused_without_plan() -> anyhow::Result<()> {
    let env = setup().await?;
    let s = env.state().await?;
    assert_eq!(s["paused"], json!(true));
    assert_eq!(s["target_asset"], json!(null));
    assert_eq!(s["destination_address"], json!(null));
    assert_eq!(s["owner"], json!(env.alice.id()));
    Ok(())
}

#[tokio::test]
async fn callbacks_are_private() -> anyhow::Result<()> {
    let env = setup().await?;
    let r = env
        .keeper
        .call(&env.vault_id, "on_buy_transfer")
        .args_json(json!({ "quote_ref": "x", "deposit_address": env.keeper.id(), "amount": "1", "previous_last_run_at_s": 0 }))
        .transact()
        .await?;
    assert!(r.is_failure());
    let r = env
        .keeper
        .call(env.factory.id(), "on_vault_registered")
        .args_json(json!({ "owner": env.alice.id(), "vault": env.vault_id }))
        .transact()
        .await?;
    assert!(r.is_failure());
    Ok(())
}
