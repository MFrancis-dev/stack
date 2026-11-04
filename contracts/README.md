# Stack contracts

- `factory/` — creates one vault per owner (keeper only, daily cap), pays storage.
- `vault/` — holds one owner's USDC; bounded scheduled buys; owner-only withdraw.
- `tests/` — near-workspaces integration tests, one per invariant I1–I7.

Spec: `../ARCHITECTURE.md` §3 · Roadmap: Phase 1 (K1.x)

```bash
pnpm contracts:build   # cargo near build for vault + factory → target/near/
pnpm contracts:test    # unit tests + near-workspaces sandbox tests (builds wasm via the `cargo near` CLI)
```

- `mock-ft/` — test-only NEP-141/NEP-145 token standing in for USDC.

Deploy order (human-approved, K1.13): factory `new(admin, keeper, usdc, daily_cap)` → admin `set_vault_code` with the vault wasm as raw input → keeper `create_vault_for(owner)` per user.
