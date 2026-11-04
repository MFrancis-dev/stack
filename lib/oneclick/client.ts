/**
 * 1Click SDK setup. The SDK keeps one global config, so call this once at server/worker start.
 * Roadmap: K3.1 · Spec: ARCHITECTURE.md §4.2
 */

import { ApiError, OpenAPI } from "@defuse-protocol/one-click-sdk-typescript";

export const DEFAULT_ONECLICK_BASE_URL = "https://1click.chaindefuser.com";

export function configureOneClick({ baseUrl = DEFAULT_ONECLICK_BASE_URL, jwt }: { baseUrl?: string; jwt?: string }): void {
  OpenAPI.BASE = baseUrl;
  // Without a partner JWT 1Click adds a fee and refuses non-dry quotes (ARCHITECTURE §12).
  OpenAPI.TOKEN = jwt || undefined;
}

export class OneClickError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly correlationId: string | null,
  ) {
    super(message);
    this.name = "OneClickError";
  }
}

/** Normalises SDK errors into a readable message, including the misleading ones we know about. */
export function toOneClickError(e: unknown): OneClickError {
  if (e instanceof OneClickError) return e;
  if (e instanceof ApiError) {
    const body = (e.body ?? {}) as { message?: string; correlationId?: string };
    let message = body.message ?? e.message;
    // A refundTo account that doesn't exist comes back as a 400 "Internal server error" (ARCHITECTURE §12).
    if (message === "Internal server error") message = "1Click rejected the quote (check that the refund account exists)";
    if (message === "Failed to get quote") message = "No quote available (real quotes need a partner JWT, or no route exists)";
    return new OneClickError(message, e.status, body.correlationId ?? null);
  }
  return new OneClickError(e instanceof Error ? e.message : String(e), null, null);
}
