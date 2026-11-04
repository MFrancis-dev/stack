import { NextResponse } from "next/server";

/**
 * GET /api/tokens — cached 1Click token list.
 * Roadmap: K4.3 · Spec: ARCHITECTURE.md §4.1
 * Status: scaffold — not implemented yet.
 */

export async function GET() {
  return NextResponse.json({ error: "Not implemented (K4.3)" }, { status: 501 });
}
