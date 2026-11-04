# Stack contracts

- `factory/` — creates one vault per owner (keeper only, daily cap), pays storage.
- `vault/` — holds one owner's USDC; bounded scheduled buys; owner-only withdraw.
- `tests/` — near-workspaces integration tests, one per invariant I1–I7.

Spec: `../ARCHITECTURE.md` §3 · Roadmap: Phase 1 (K1.x)

```bash
cargo near build   # in factory/ and vault/   (K1.x)
cargo test         # unit + integration       (K1.9–K1.10)
```
