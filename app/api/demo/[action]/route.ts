/**
 * Demo mode (K7.x). `start` creates a fresh demo saver and signs the visitor in as them; the rest need a
 * demo session: `reset`, `fast-forward` (30 days), `owner-tx` (apply a vault transaction without a wallet).
 * Nothing here touches real services or funds. Roadmap: K7.1–K7.4
 */

import { z } from "zod";
import { getUserById } from "@/lib/db/queries/users";
import { fastForward, resetDemoUser, seedDemoUser } from "@/lib/db/seed-demo";
import { applyOwnerTx, DemoRuleError } from "@/lib/near/demo";
import { getServices } from "@/lib/server/adapters";
import { clientIp, handle, HttpError, json, parseBody } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rateLimit";
import { requireSession, sessionCookie } from "@/lib/server/session";

const ownerTxInput = z.object({
  tx: z.object({
    receiverId: z.string().min(1),
    actions: z
      .array(
        z.object({
          type: z.literal("FunctionCall"),
          params: z.object({ methodName: z.string(), args: z.record(z.unknown()), gas: z.string(), deposit: z.string() }),
        }),
      )
      .min(1)
      .max(4),
  }),
});

async function demoUser(req: Request) {
  const session = requireSession(req);
  if (!session.demo) throw new HttpError(403, "Only available in demo mode");
  const { db } = await getServices();
  const user = await getUserById(db, session.userId);
  if (!user?.isDemo) throw new HttpError(401, "Demo expired, start it again");
  return { db, user };
}

export const POST = handle(async (req: Request, ctx: { params: Promise<{ action: string }> }) => {
  const { action } = await ctx.params;
  try {
    switch (action) {
      case "start": {
        rateLimit(`demo-start:${clientIp(req)}`, 10, 60_000);
        const { db } = await getServices();
        const user = await seedDemoUser(db);
        return json(
          { accountId: user.nearAccountId, vaultAccountId: user.vaultAccountId },
          { status: 201, headers: { "set-cookie": sessionCookie({ userId: user.id, accountId: user.nearAccountId, demo: true }) } },
        );
      }
      case "reset": {
        const { db, user } = await demoUser(req);
        await resetDemoUser(db, user);
        return json({ ok: true });
      }
      case "fast-forward": {
        const { db, user } = await demoUser(req);
        return json(await fastForward(db, user, 30));
      }
      case "owner-tx": {
        const { db, user } = await demoUser(req);
        const { tx } = await parseBody(req, ownerTxInput);
        return json({ state: await applyOwnerTx(db, user.vaultAccountId!, tx) });
      }
      default:
        throw new HttpError(404, "Unknown demo action");
    }
  } catch (e) {
    if (e instanceof DemoRuleError) throw new HttpError(409, e.message);
    throw e;
  }
});
