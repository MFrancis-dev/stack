import { NextResponse } from "next/server";

/**
 * GET /api/vault — get_state + USDC balance + next run.
 * Roadmap: K4.3 · Spec: ARCHITECTURE.md §4.1
 * Status: scaffold — not implemented yet.
 */

export async function GET() {
  return NextResponse.json({ error: "Not implemented (K4.3)" }, { status: 501 });
}
