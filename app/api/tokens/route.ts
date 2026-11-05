/**
 * GET /api/tokens — cached 1Click token list (what users can fund from). Falls back to a small built-in
 * list (flagged `offline`) when 1Click can't be reached, so the page still works.
 * Roadmap: K4.3 · Spec: ARCHITECTURE.md §4.1
 */

import { FALLBACK_TOKENS } from "@/lib/oneclick/demo";
import { getServices } from "@/lib/server/adapters";
import { handle, json } from "@/lib/server/http";

export const GET = handle(async () => {
  try {
    const tokens = await (await getServices()).listTokens();
    return json({ tokens, offline: false }, { headers: { "cache-control": "public, max-age=300" } });
  } catch {
    return json({ tokens: FALLBACK_TOKENS, offline: true }, { headers: { "cache-control": "no-store" } });
  }
});
