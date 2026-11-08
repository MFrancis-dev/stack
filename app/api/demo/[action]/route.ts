/**
 * Demo mode (K7.x). `start` creates a fresh demo saver and signs the visitor in as them; the rest need a
 * demo session: `reset`, `fast-forward` (30 days), `owner-tx` (apply a vault transaction without a wallet).
 * Nothing here touches real services or funds. Every action is capped in the database, so a script
 * can't fill the hosted database (K13.6). Roadmap: K7.1–K7.4, K13.6
 */

import { z } from "zod";
import { getUserById } from "@/lib/db/queries/users";
import { fastForward, resetDemoUser, seedDemoUser } from "@/lib/db/seed-demo";
import { applyOwnerTx, DemoRuleError } from "@/lib/near/demo";
import { getServices } from "@/lib/server/adapters";
import { clientIp, handle, HttpError, json, parseBody } from "@/lib/server/http";
import { DAY, DEMO_LIMITS, HOUR, MINUTE } from "@/lib/server/demoLimits";
import { rateLimit } from "@/lib/server/rateLimit";
import { requireSession, sessionCookie, sessionRevoked } from "@/lib/server/session";

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
  if (!user?.isDemo || sessionRevoked(session, user.sessionsValidAfter)) throw new HttpError(401, "Demo expired, start it again");
  return { db, user };
}

export const POST = handle(async (req: Request, ctx: { params: Promise<{ action: string }> }) => {
  const { action } = await ctx.params;
  try {
    switch (action) {
      case "start": {
        const { db } = await getServices();
        const ip = clientIp(req);
        await rateLimit(db, `demo-start:${ip}`, DEMO_LIMITS.startPerIpMinute, MINUTE);
        await rateLimit(db, `demo-start-hour:${ip}`, DEMO_LIMITS.startPerIpHour, HOUR);
        await rateLimit(db, "demo-start:all", DEMO_LIMITS.startAllHour, HOUR, Date.now(), "The demo is busy right now. Try again in a few minutes.");
        const user = await seedDemoUser(db);
        return json(
          { accountId: user.nearAccountId, vaultAccountId: user.vaultAccountId },
          { status: 201, headers: { "set-cookie": sessionCookie({ userId: user.id, accountId: user.nearAccountId, demo: true }) } },
        );
      }
      case "reset": {
        const { db, user } = await demoUser(req);
        await rateLimit(db, `demo-reset:${user.id}`, DEMO_LIMITS.resetPerDemo, DAY, Date.now(), "This demo has been reset enough times. Start a new demo from the landing page.");
        await resetDemoUser(db, user);
        return json({ ok: true });
      }
      case "fast-forward": {
        const { db, user } = await demoUser(req);
        await rateLimit(db, `demo-ff:${user.id}`, DEMO_LIMITS.fastForwardPerDemo, DAY, Date.now(), "This demo has fast-forwarded as far as it goes. Start a new demo from the landing page.");
        return json(await fastForward(db, user, 30));
      }
      case "owner-tx": {
        const { db, user } = await demoUser(req);
        await rateLimit(db, `demo-tx:${user.id}`, DEMO_LIMITS.ownerTxPerDemoHour, HOUR);
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
