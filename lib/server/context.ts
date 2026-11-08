import "server-only";

/**
 * Per-request context: the signed-in user (and their vault). Roadmap: K4.x
 */

import { getUserById } from "../db/queries/users";
import type { User } from "../db/schema";
import { servicesFor, type Services } from "./adapters";
import { HttpError } from "./http";
import { requireSession, sessionRevoked, type Session } from "./session";

export interface UserContext {
  session: Session;
  services: Services;
  user: User;
}

export async function requireUser(req: Request): Promise<UserContext> {
  const session = requireSession(req);
  const services = await servicesFor(session);
  const user = await getUserById(services.db, session.userId);
  if (!user || user.isDemo !== session.demo || sessionRevoked(session, user.sessionsValidAfter)) throw new HttpError(401, "Sign in again");
  return { session, services, user };
}

export async function requireVaultOwner(req: Request): Promise<UserContext & { vaultAccountId: string }> {
  const ctx = await requireUser(req);
  if (!ctx.user.vaultAccountId) throw new HttpError(409, "Create your vault first");
  return { ...ctx, vaultAccountId: ctx.user.vaultAccountId };
}
