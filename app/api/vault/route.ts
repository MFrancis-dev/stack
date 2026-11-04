/**
 * GET /api/vault — on-chain plan + USDC balance for the signed-in user's vault.
 * Roadmap: K4.3 · Spec: ARCHITECTURE.md §4.1
 */

import { USDC_DECIMALS } from "@/lib/core/assets";
import { formatAmount } from "@/lib/core/money";
import { requireVaultClient } from "@/lib/server/adapters";
import { requireUser } from "@/lib/server/context";
import { handle, json } from "@/lib/server/http";

export const GET = handle(async (req: Request) => {
  const { services, user } = await requireUser(req);
  if (!user.vaultAccountId) return json({ accountId: user.nearAccountId, vaultAccountId: null });
  const vaults = requireVaultClient(services);
  const [state, balance] = await Promise.all([vaults.getState(user.vaultAccountId), vaults.usdcBalance(user.vaultAccountId)]);
  return json({
    accountId: user.nearAccountId,
    vaultAccountId: user.vaultAccountId,
    state,
    usdcBalance: balance,
    usdcBalanceFormatted: formatAmount(balance, USDC_DECIMALS),
  });
});
