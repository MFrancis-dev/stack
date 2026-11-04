/**
 * Real VaultClient backed by NEAR RPC + the keeper account. Demo client lives in demo.ts (K7.1).
 * Roadmap: K3.3
 */

import type { VaultClient } from "../core/adapters";
import { createVaultFor } from "./factory";
import type { NearProvider } from "./rpc";
import { executeBuy, getUsdcBalance, getVaultState, type KeeperAccount } from "./vault";

export function nearVaultClient(deps: {
  provider: Pick<NearProvider, "callFunction">;
  keeper: KeeperAccount;
  factoryId: string;
  usdcContractId: string;
}): VaultClient {
  return {
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
      const r = await executeBuy(deps.keeper, input);
      if (!r.sent) throw new Error(`Buy transfer failed on-chain (tx ${r.txHash})`);
      return { txHash: r.txHash };
    },
  };
}
