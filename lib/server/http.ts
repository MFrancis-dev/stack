/**
 * Small HTTP helpers shared by route handlers: JSON responses, body parsing, error mapping.
 * Roadmap: K4.x
 */

import type { z } from "zod";
import { OneClickError } from "../oneclick/client";
import { redact } from "./redact";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Real-mode dependency missing (no keeper, RPC, factory…). Demo mode never hits this. */
export class NotConfiguredError extends HttpError {
  constructor(what: string) {
    super(503, `Not configured: ${what}. Run \`pnpm check-env\`, or use demo mode.`);
  }
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, init);
}

export async function parseBody<S extends z.ZodTypeAny>(req: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Body must be JSON");
  }
  const r = schema.safeParse(body);
  if (!r.success) throw new HttpError(400, "Invalid request", r.error.flatten());
  return r.data;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

/** Wraps a handler so every error becomes a JSON response with the right status. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, details: e.details }, { status: e.status });
      if (e instanceof OneClickError) return json({ error: e.message, correlationId: e.correlationId }, { status: 502 });
      console.error("unhandled route error", redact(e instanceof Error ? e.message : String(e)));
      return json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}
