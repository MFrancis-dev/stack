import { NextResponse } from "next/server";

/**
 * GET /api/fund/:id/status — funding status.
 * Roadmap: K4.4 · Spec: ARCHITECTURE.md §4.1
 * Status: scaffold — not implemented yet.
 */

export async function GET() {
  return NextResponse.json({ error: "Not implemented (K4.4)" }, { status: 501 });
}
