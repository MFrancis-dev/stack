/**
 * POST /api/onboard — the keeper creates the signed-in user's vault (once). Free for the user.
 * A new vault is paused with no plan (I7). Roadmap: K4.2 · Spec: ARCHITECTURE.md §6
 */

import { setVault } from "@/lib/db/queries/users";
import { requireVaultClient } from "@/lib/server/adapters";
import { requireUser } from "@/lib/server/context";
import { handle, json } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rateLimit";

export const POST = handle(async (req: Request) => {
  const { services, user } = await requireUser(req);
  if (user.vaultAccountId) return json({ vaultAccountId: user.vaultAccountId, created: false });

  await rateLimit(services.db, `onboard:${user.id}`, 3, 60 * 60 * 1000);
  const vaults = requireVaultClient(services);
  const existing = await vaults.findVault(user.nearAccountId);
  const vaultAccountId = existing ?? (await vaults.createVaultFor(user.nearAccountId)).vaultAccountId;
  await setVault(services.db, user.id, vaultAccountId);
  return json({ vaultAccountId, created: !existing }, { status: existing ? 200 : 201 });
});
