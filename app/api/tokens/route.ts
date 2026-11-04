/**
 * GET /api/tokens — cached 1Click token list (what users can fund from).
 * Roadmap: K4.3 · Spec: ARCHITECTURE.md §4.1
 */

import { getServices } from "@/lib/server/adapters";
import { handle, json } from "@/lib/server/http";

export const GET = handle(async () => {
  const tokens = await (await getServices()).listTokens();
  return json({ tokens }, { headers: { "cache-control": "public, max-age=300" } });
});
