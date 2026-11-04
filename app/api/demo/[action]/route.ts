import { NextResponse } from "next/server";

/**
 * POST /api/demo/:action — fast-forward, reset (demo sessions only).
 * Roadmap: K7.4 · Spec: ARCHITECTURE.md §4.1
 * Status: scaffold — not implemented yet.
 */

export async function POST() {
  return NextResponse.json({ error: "Not implemented (K7.4)" }, { status: 501 });
}
