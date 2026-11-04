//! Shared sandbox setup: mock USDC, factory with vault code, one vault for alice. Roadmap: K1.8
use near_workspaces::network::Sandbox;
use near_workspaces::result::ExecutionFinalResult;
use near_workspaces::types::{Gas, NearToken};
use near_workspaces::{Account, Contract, Worker};
use serde_json::json;
use std::sync::OnceLock;
use tokio::sync::Mutex;

pub const USDC_SUPPLY: u128 = 1_000_000_000_000; // 1M USDC (6 decimals)
pub const PER_RUN: u128 = 100_000_000; // 100 USDC
pub const TGAS_300: Gas = Gas::from_tgas(300);
pub const STORAGE_FOR_DEPOSIT_ADDR: NearToken = NearToken::from_millinear(13);

pub struct Wasm {
    pub vault: Vec<u8>,
    pub factory: Vec<u8>,
    pub ft: Vec<u8>,
}

static WASM: OnceLock<Wasm> = OnceLock::new();
static BUILD_LOCK: Mutex<()> = Mutex::const_new(());

/// Builds each contract once per test binary.
pub async fn wasm() -> anyhow::Result<&'static Wasm> {
    let _guard = BUILD_LOCK.lock().await;
    if let Some(w) = WASM.get() {
        return Ok(w);
    }
    let w = Wasm {
        vault: near_workspaces::compile_project("../vault").await?,
        factory: near_workspaces::compile_project("../factory").await?,
        ft: near_workspaces::compile_project("../mock-ft").await?,
    };
    Ok(WASM.get_or_init(|| w))
}

pub struct Env {
    pub worker: Worker<Sandbox>,
    pub usdc: Contract,
    pub factory: Contract,
    pub admin: Account,
    pub keeper: Account,
    pub alice: Account,
    pub funder: Account,
    pub vault: Account, // handle to call the vault as a contract id
    pub vault_id: near_workspaces::AccountId,
}

pub async fn sub(root: &Account, name: &str, near: u128) -> anyhow::Result<Account> {
    Ok(root
        .create_subaccount(name)
        .initial_balance(NearToken::from_near(near))
        .transact()
        .await?
        .into_result()?)
}

pub fn assert_ok(r: &ExecutionFinalResult) {
    assert!(r.is_success(), "expected success, got {:#?}", r.clone().into_result().err());
}

pub fn logs_contain(r: &ExecutionFinalResult, needle: &str) -> bool {
    r.logs().iter().any(|l| l.contains(needle))
}

pub async fn register(usdc: &Contract, who: &Account, account_id: &near_workspaces::AccountId) -> anyhow::Result<()> {
    let r = who
        .call(usdc.id(), "storage_deposit")
        .args_json(json!({ "account_id": account_id, "registration_only": true }))
        .deposit(NearToken::from_millinear(13))
        .transact()
        .await?;
    assert_ok(&r);
    Ok(())
}

pub async fn balance(usdc: &Contract, id: &near_workspaces::AccountId) -> anyhow::Result<u128> {
    let v: String = usdc.view("ft_balance_of").args_json(json!({ "account_id": id })).await?.json()?;
    Ok(v.parse()?)
}

/// Deploys everything and creates alice's vault through the factory, like production.
pub async fn setup() -> anyhow::Result<Env> {
    let w = wasm().await?;
    let worker = near_workspaces::sandbox().await?;
    let root = worker.root_account()?;

    let admin = sub(&root, "admin", 10).await?;
    let keeper = sub(&root, "keeper", 10).await?;
    let alice = sub(&root, "alice", 10).await?;
    let funder = sub(&root, "funder", 10).await?;

    let usdc_acc = sub(&root, "usdc", 20).await?;
    let usdc = usdc_acc.deploy(&w.ft).await?.into_result()?;
    assert_ok(&usdc.call("new").args_json(json!({ "owner_id": funder.id(), "total_supply": USDC_SUPPLY.to_string() })).transact().await?);

    let factory_acc = sub(&root, "factory", 50).await?;
    let factory = factory_acc.deploy(&w.factory).await?.into_result()?;
    assert_ok(
        &factory
            .call("new")
            .args_json(json!({ "admin": admin.id(), "keeper": keeper.id(), "usdc": usdc.id(), "daily_cap": 10 }))
            .transact()
            .await?,
    );
    assert_ok(&admin.call(factory.id(), "set_vault_code").args(w.vault.clone()).max_gas().transact().await?);

    let r = keeper
        .call(factory.id(), "create_vault_for")
        .args_json(json!({ "owner": alice.id() }))
        .gas(TGAS_300)
        .transact()
        .await?;
    assert_ok(&r);
    assert!(logs_contain(&r, "\"event\":\"vault_created\""), "logs: {:?}", r.logs());

    let vault_id: near_workspaces::AccountId = factory
        .view("get_vault")
        .args_json(json!({ "owner": alice.id() }))
        .await?
        .json::<Option<near_workspaces::AccountId>>()?
        .expect("vault recorded");
    let vault = Account::from_secret_key(vault_id.clone(), near_workspaces::types::SecretKey::from_random(near_workspaces::types::KeyType::ED25519), &worker);

    register(&usdc, &alice, alice.id()).await?;
    Ok(Env { worker, usdc, factory, admin, keeper, alice, funder, vault, vault_id })
}

impl Env {
    pub async fn fund_vault(&self, amount: u128) -> anyhow::Result<()> {
        let r = self
            .funder
            .call(self.usdc.id(), "ft_transfer")
            .args_json(json!({ "receiver_id": self.vault_id, "amount": amount.to_string() }))
            .deposit(NearToken::from_yoctonear(1))
            .transact()
            .await?;
        assert_ok(&r);
        Ok(())
    }

    pub async fn set_plan_and_resume(&self, per_run: u128) -> anyhow::Result<()> {
        let r = self
            .alice
            .call(&self.vault_id, "set_plan")
            .args_json(json!({
                "target_asset": "nep141:btc.omft.near",
                "destination_address": "bc1qexample",
                "amount_per_run": per_run.to_string(),
                "interval_s": 3600,
                "max_cost_bps": 300
            }))
            .deposit(NearToken::from_yoctonear(1))
            .transact()
            .await?;
        assert_ok(&r);
        let r = self.alice.call(&self.vault_id, "resume").deposit(NearToken::from_yoctonear(1)).transact().await?;
        assert_ok(&r);
        Ok(())
    }

    pub async fn deposit_account(&self, name: &str) -> anyhow::Result<Account> {
        sub(&self.worker.root_account()?, name, 2).await
    }

    pub async fn buy(&self, quote_ref: &str, to: &near_workspaces::AccountId, amount: u128, storage: NearToken) -> anyhow::Result<ExecutionFinalResult> {
        Ok(self
            .keeper
            .call(&self.vault_id, "execute_buy")
            .args_json(json!({ "quote_ref": quote_ref, "deposit_address": to, "amount": amount.to_string() }))
            .deposit(storage)
            .gas(TGAS_300)
            .transact()
            .await?)
    }

    pub async fn state(&self) -> anyhow::Result<serde_json::Value> {
        Ok(self.vault.view(&self.vault_id, "get_state").await?.json()?)
    }
}
