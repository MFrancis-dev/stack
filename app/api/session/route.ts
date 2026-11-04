/**
 * NEP-413 sign-in. GET issues a challenge (nonce in a signed cookie), POST verifies the wallet's
 * signature and sets the session cookie, DELETE signs out.
 * Roadmap: K4.1 · Spec: ARCHITECTURE.md §4.1, §6
 */

import { sessionInput } from "@/lib/core/schemas";
import { upsertUser } from "@/lib/db/queries/users";
import { verifySignIn } from "@/lib/near/nep413";
import { getServices, requireNear } from "@/lib/server/adapters";
import { handle, HttpError, json, parseBody } from "@/lib/server/http";
import { CHALLENGE_COOKIE, clearCookie, newChallenge, readChallenge, SESSION_COOKIE, sessionCookie } from "@/lib/server/session";

export const GET = handle(async () => {
  const { challenge, setCookie } = newChallenge();
  return json(
    { nonce: challenge.nonce, message: challenge.message, recipient: challenge.recipient },
    { headers: { "set-cookie": setCookie, "cache-control": "no-store" } },
  );
});

export const POST = handle(async (req: Request) => {
  const body = await parseBody(req, sessionInput);
  const challenge = readChallenge(req);
  if (!challenge) throw new HttpError(401, "Sign-in request expired, try again");
  if (body.nonce !== challenge.nonce || body.message !== challenge.message) throw new HttpError(401, "Sign-in request doesn't match");

  const services = await getServices();
  try {
    await verifySignIn(body, challenge.recipient, requireNear(services));
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(401, "Signature check failed");
  }

  const user = await upsertUser(services.db, body.accountId);
  const headers = new Headers();
  headers.append("set-cookie", sessionCookie({ userId: user.id, accountId: user.nearAccountId, demo: false }));
  headers.append("set-cookie", clearCookie(CHALLENGE_COOKIE));
  return json({ accountId: user.nearAccountId, vaultAccountId: user.vaultAccountId }, { headers });
});

export const DELETE = handle(async () => json({ ok: true }, { headers: { "set-cookie": clearCookie(SESSION_COOKIE) } }));
