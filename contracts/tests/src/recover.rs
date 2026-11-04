//! Stray tokens can be recovered by the owner only. Roadmap: K1.10
use crate::setup::*;
use near_workspaces::types::NearToken;
use serde_json::json;

#[tokio::test]
async fn stray_token_recoverable_by_owner() -> anyhow::Result<()> {
    let env = setup().await?;
    let w = wasm().await?;
    let root = env.worker.root_account()?;
    let other_acc = sub(&root, "other", 10).await?;
    let other = other_acc.deploy(&w.ft).await?.into_result()?;
    assert_ok(&other.call("new").args_json(json!({ "owner_id": env.funder.id(), "total_supply": "1000" })).transact().await?);
    register(&other, &env.funder, &env.vault_id).await?;
    register(&other, &env.funder, env.alice.id()).await?;
    assert_ok(
        &env.funder
            .call(other.id(), "ft_transfer")
            .args_json(json!({ "receiver_id": env.vault_id, "amount": "400" }))
            .deposit(NearToken::from_yoctonear(1))
            .transact()
            .await?,
    );

    let r = env
        .alice
        .call(&env.vault_id, "recover_token")
        .args_json(json!({ "token": other.id(), "amount": "400" }))
        .deposit(NearToken::from_yoctonear(1))
        .max_gas()
        .transact()
        .await?;
    assert_ok(&r);
    assert!(logs_contain(&r, "\"event\":\"token_recovered\""));
    assert_eq!(balance(&other, env.alice.id()).await?, 400);
    Ok(())
}
