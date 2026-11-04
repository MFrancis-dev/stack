import { NextResponse } from "next/server";

/**
 * GET /api/export.csv — CSV with USD value per buy.
 * Roadmap: K4.6 · Spec: ARCHITECTURE.md §4.1
 * Status: scaffold — not implemented yet.
 */

export async function GET() {
  return NextResponse.json({ error: "Not implemented (K4.6)" }, { status: 501 });
}
