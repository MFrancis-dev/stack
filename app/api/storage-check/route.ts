/**
 * GET /api/storage-check?account=… — can this NEAR account receive wNEAR (registered on wrap.near)?
 * A NEAR plan must not start until it can: Intents gives no refund to an unregistered receiver.
 * Demo sessions always answer yes. Roadmap: K8.2 · Spec: ARCHITECTURE.md §12
 */

import { isValidNearAccount } from "@/lib/core/address";
import { view } from "@/lib/near/rpc";
import { requireNear } from "@/lib/server/adapters";
import { requireUser } from "@/lib/server/context";
import { handle, HttpError, json } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rateLimit";

const WNEAR_CONTRACT = "wrap.near";

export const GET = handle(async (req: Request) => {
  const { services, session, user } = await requireUser(req);
  const account = new URL(req.url).searchParams.get("account")?.trim() ?? "";
  if (!isValidNearAccount(account)) throw new HttpError(400, "Not a valid NEAR account");
  if (session.demo) return json({ account, registered: true });
  await rateLimit(services.db, `storage-check:${user.id}`, 30, 60_000);
  const balance = await view<unknown>(requireNear(services), WNEAR_CONTRACT, "storage_balance_of", { account_id: account });
  return json({ account, registered: balance !== null && balance !== undefined });
});
