import "server-only";

/**
 * Sessions after NEP-413 sign-in. Tokens are `base64url(json).base64url(hmac-sha256)` in HTTP-only
 * cookies. A short-lived challenge cookie carries the server-issued 32-byte nonce.
 * Roadmap: K4.1 · Spec: ARCHITECTURE.md §6
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http";

export const SESSION_COOKIE = "stack_session";
export const CHALLENGE_COOKIE = "stack_challenge";
const SESSION_TTL_S = 7 * 24 * 3600;
const CHALLENGE_TTL_S = 5 * 60;
export const SIGN_IN_MESSAGE = "Sign in to Stack";

export interface Session {
  userId: string;
  accountId: string;
  demo: boolean;
  /** Issued at, unix seconds. Older tokens have none: `issuedAtS` derives it from `exp`. */
  iat?: number;
  exp: number;
}

export interface Challenge {
  nonce: string;
  message: string;
  recipient: string;
  exp: number;
}

// On globalThis, not module state: Next compiles each route into its own bundle, and a module-level
// secret would differ between the route that signs a session and the one that checks it.
const g = globalThis as typeof globalThis & { __stackDevSessionSecret?: Buffer };

function secret(): Buffer {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return Buffer.from(s);
  if (process.env.NODE_ENV === "production") throw new HttpError(500, "SESSION_SECRET is not set");
  // Local and demo mode: a per-process secret, so sessions reset on restart. Fine without real funds.
  g.__stackDevSessionSecret ??= randomBytes(32);
  return g.__stackDevSessionSecret;
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export function signToken(payload: object): string {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${b64url(createHmac("sha256", secret()).update(body).digest())}`;
}

export function verifyToken<T extends { exp: number }>(token: string | undefined, now = Date.now()): T | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", secret()).update(body).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as T;
    return data.exp * 1000 > now ? data : null;
  } catch {
    return null;
  }
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

function cookie(name: string, value: string, maxAgeS: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeS}${secure}`;
}

export function clearCookie(name: string): string {
  return cookie(name, "", 0);
}

export function getSession(req: Request): Session | null {
  return verifyToken<Session>(readCookie(req, SESSION_COOKIE));
}

export function requireSession(req: Request): Session {
  const s = getSession(req);
  if (!s) throw new HttpError(401, "Sign in first");
  return s;
}

export function sessionCookie(data: Omit<Session, "exp" | "iat">, now = Date.now()): string {
  const iat = Math.floor(now / 1000);
  return cookie(SESSION_COOKIE, signToken({ ...data, iat, exp: iat + SESSION_TTL_S }), SESSION_TTL_S);
}

function issuedAtS(s: Session): number {
  return s.iat ?? s.exp - SESSION_TTL_S;
}

/** True when the user signed out (or was signed out) after this session was issued (K13.4). */
export function sessionRevoked(session: Session, sessionsValidAfter: Date | null): boolean {
  return sessionsValidAfter !== null && issuedAtS(session) < Math.floor(sessionsValidAfter.getTime() / 1000);
}

/** The NEP-413 `recipient`: this app's host, so a signature for another site can't be replayed here. */
export function appRecipient(): string {
  return new URL(process.env.PUBLIC_APP_URL || "http://localhost:3000").host;
}

export function newChallenge(now = Date.now()): { challenge: Challenge; setCookie: string } {
  const challenge: Challenge = {
    nonce: randomBytes(32).toString("base64"),
    message: SIGN_IN_MESSAGE,
    recipient: appRecipient(),
    exp: Math.floor(now / 1000) + CHALLENGE_TTL_S,
  };
  return { challenge, setCookie: cookie(CHALLENGE_COOKIE, signToken(challenge), CHALLENGE_TTL_S) };
}

export function readChallenge(req: Request): Challenge | null {
  return verifyToken<Challenge>(readCookie(req, CHALLENGE_COOKIE));
}
