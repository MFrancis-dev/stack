import { Account, KeyPair, KeyPairSigner } from "near-api-js";
import { signMessage } from "near-api-js/nep413";
import { describe, expect, it, vi } from "vitest";
import { asBaseUnits } from "../core/money";
import { createVaultFor } from "./factory";
import { eventsOf, parseEvents } from "./events";
import { nearVaultClient } from "./index";
import { verifySignIn } from "./nep413";
import { executeBuy, toVaultState, type VaultViewRaw } from "./vault";

// Roadmap: K3.3
const ev = (event: string, data: unknown = []) => `EVENT_JSON:${JSON.stringify({ standard: "stack_vault", version: "1.0.0", event, data })}`;
const outcome = (logs: string[]) => ({ transaction_outcome: { id: "TX1" }, receipts_outcome: [{ outcome: { logs } }] });

describe("events", () => {
  it("parses NEP-297 logs and ignores everything else", () => {
    const e = parseEvents(["hello", ev("paused"), "EVENT_JSON:{broken", ev("buy_sent", [{ quote_ref: "q1" }])]);
    expect(e.map((x) => x.event)).toEqual(["paused", "buy_sent"]);
    expect(eventsOf(outcome([ev("resumed")]))[0]?.event).toBe("resumed");
  });
});

describe("vault bindings", () => {
  const raw: VaultViewRaw = {
    owner: "alice.near",
    keeper: "keeper.near",
    usdc: "usdc.near",
    target_asset: "nep141:btc.omft.near",
    destination_address: "bc1q",
    amount_per_run: "100000000",
    interval_s: 3600,
    max_cost_bps: 300,
    paused: false,
    last_run_at_s: 10,
    next_run_at_s: 3610,
  };

  it("maps get_state to camelCase", () => {
    expect(toVaultState(raw)).toMatchObject({ targetAsset: "nep141:btc.omft.near", amountPerRun: "100000000", nextRunAtS: 3610 });
  });

  it("sends execute_buy with storage deposit and reports buy_sent", async () => {
    const keeper = { signAndSendTransaction: vi.fn().mockResolvedValue(outcome([ev("buy_sent")])) };
    const r = await executeBuy(keeper, { vaultAccountId: "v1.factory.near", quoteRef: "q1", depositAddress: "dep.near", amount: asBaseUnits("5") });
    expect(r).toMatchObject({ txHash: "TX1", sent: true });
    const call = keeper.signAndSendTransaction.mock.calls[0]![0];
    expect(call.receiverId).toBe("v1.factory.near");
    expect(JSON.stringify(call.actions[0], (_k, v) => (typeof v === "bigint" ? v.toString() : v))).toContain("execute_buy");
  });

  it("treats buy_failed as a failure in the adapter", async () => {
    const keeper = { signAndSendTransaction: vi.fn().mockResolvedValue(outcome([ev("buy_failed")])) };
    const client = nearVaultClient({ provider: { callFunction: vi.fn() } as never, keeper, factoryId: "f", usdcContractId: "u" });
    await expect(client.executeBuy({ vaultAccountId: "v", quoteRef: "q", depositAddress: "d", amount: asBaseUnits("1") })).rejects.toThrow(/failed on-chain/);
  });

  it("reads views through the provider", async () => {
    const provider = { callFunction: vi.fn().mockResolvedValueOnce(raw).mockResolvedValueOnce("250") };
    const client = nearVaultClient({ provider: provider as never, keeper: { signAndSendTransaction: vi.fn() }, factoryId: "f", usdcContractId: "usdc.near" });
    expect((await client.getState("v")).paused).toBe(false);
    expect(await client.usdcBalance("v")).toBe("250");
    expect(provider.callFunction).toHaveBeenLastCalledWith({ contractId: "usdc.near", method: "ft_balance_of", args: { account_id: "v" } });
  });
});

describe("factory bindings", () => {
  it("returns the vault id from vault_created", async () => {
    const log = `EVENT_JSON:${JSON.stringify({ standard: "stack_factory", version: "1.0.0", event: "vault_created", data: [{ owner: "alice.near", vault: "vabc.factory.near" }] })}`;
    const keeper = { signAndSendTransaction: vi.fn().mockResolvedValue(outcome([log])) };
    expect(await createVaultFor(keeper, "factory.near", "alice.near")).toMatchObject({ vaultAccountId: "vabc.factory.near", registrationFailed: false });
  });

  it("flags a failed USDC registration", async () => {
    const log = `EVENT_JSON:${JSON.stringify({ standard: "stack_factory", version: "1.0.0", event: "vault_registration_failed", data: [{}] })}`;
    const keeper = { signAndSendTransaction: vi.fn().mockResolvedValue(outcome([log])) };
    const client = nearVaultClient({ provider: { callFunction: vi.fn() } as never, keeper, factoryId: "f", usdcContractId: "u" });
    await expect(client.createVaultFor("alice.near")).rejects.toThrow(/registration failed/);
  });
});

describe("NEP-413 sign-in", () => {
  const recipient = "stack.app";
  const nonce = new Uint8Array(32).fill(7);

  async function signed(message = "Sign in to Stack") {
    const key = KeyPair.fromRandom("ed25519");
    const account = new Account("alice.near", "http://127.0.0.1:1", new KeyPairSigner(key));
    const s = await signMessage({ signerAccount: account, payload: { message, recipient, nonce } });
    return {
      proof: {
        accountId: "alice.near",
        publicKey: key.getPublicKey().toString(),
        signature: Buffer.from(s.signature).toString("base64"),
        message,
        nonce: Buffer.from(nonce).toString("base64"),
      },
    };
  }

  const fullAccess = { viewAccessKey: vi.fn().mockResolvedValue({ permission: "FullAccess" }) };

  it("accepts a valid signature from a full-access key", async () => {
    const { proof } = await signed();
    await expect(verifySignIn(proof, recipient, fullAccess as never)).resolves.toBeUndefined();
  });

  it("rejects a changed message, a wrong recipient, and a function-call key", async () => {
    const { proof } = await signed();
    await expect(verifySignIn({ ...proof, message: "Sign in to Stack!" }, recipient, fullAccess as never)).rejects.toThrow();
    await expect(verifySignIn(proof, "evil.app", fullAccess as never)).rejects.toThrow();
    const fcKey = { viewAccessKey: vi.fn().mockResolvedValue({ permission: { FunctionCall: {} } }) };
    await expect(verifySignIn(proof, recipient, fcKey as never)).rejects.toThrow(/FullAccess/);
  });

  it("rejects nonces that aren't 32 bytes", async () => {
    const { proof } = await signed();
    await expect(verifySignIn({ ...proof, nonce: Buffer.from("short").toString("base64") }, recipient, fullAccess as never)).rejects.toThrow(/32 bytes/);
  });
});
