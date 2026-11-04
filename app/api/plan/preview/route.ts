import { NextResponse } from "next/server";

/**
 * POST /api/plan/preview — dry buy quote → expected cost % for a buy size.
 * Roadmap: K4.5 · Spec: ARCHITECTURE.md §4.1
 * Status: scaffold — not implemented yet.
 */

export async function POST() {
  return NextResponse.json({ error: "Not implemented (K4.5)" }, { status: 501 });
}
