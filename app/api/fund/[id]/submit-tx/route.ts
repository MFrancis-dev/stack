import { NextResponse } from "next/server";

/**
 * POST /api/fund/:id/submit-tx — forward tx hash to 1Click.
 * Roadmap: K4.4 · Spec: ARCHITECTURE.md §4.1
 * Status: scaffold — not implemented yet.
 */

export async function POST() {
  return NextResponse.json({ error: "Not implemented (K4.4)" }, { status: 501 });
}
