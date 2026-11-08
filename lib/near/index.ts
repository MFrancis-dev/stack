/**
 * Real VaultClient backed by NEAR RPC + the keeper account. Demo client lives in demo.ts (K7.1).
 * Roadmap: K3.3
 */

import { BuyOutcomeUnknownError, type VaultClient } from "../core/adapters";
import { createVaultFor, getVault } from "./factory";
import type { NearProvider } from "./rpc";
import { executeBuy, getUsdcBalance, getVaultState, isClearTxFailure, type KeeperAccount } from "./vault";

export function nearVaultClient(deps: {
  provider: Pick<NearProvider, "callFunction">;
  keeper: KeeperAccount;
  factoryId: string;
  usdcContractId: string;
}): VaultClient {
  return {
    findVault: (owner) => getVault(deps.provider, deps.factoryId, owner),
    getState: (vaultAccountId) => getVaultState(deps.provider, vaultAccountId),
    usdcBalance: (vaultAccountId) => getUsdcBalance(deps.provider, deps.usdcContractId, vaultAccountId),
    async createVaultFor(owner) {
      const r = await createVaultFor(deps.keeper, deps.factoryId, owner);
      if (!r.vaultAccountId) {
        throw new Error(r.registrationFailed ? `Vault created but USDC registration failed (tx ${r.txHash})` : `Vault creation failed (tx ${r.txHash})`);
      }
      return { vaultAccountId: r.vaultAccountId, txHash: r.txHash };
    },
    async executeBuy(input) {
      let r;
      try {
        r = await executeBuy(deps.keeper, input);
      } catch (e) {
        if (isClearTxFailure(e)) throw e;
        throw new BuyOutcomeUnknownError(`No clear result from NEAR: ${e instanceof Error ? e.message : String(e)}`);
      }
      if (!r.sent) throw new Error(`Buy transfer failed on-chain (tx ${r.txHash})`);
      return { txHash: r.txHash };
    },
  };
}
