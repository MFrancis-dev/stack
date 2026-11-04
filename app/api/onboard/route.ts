import { NextResponse } from "next/server";

/**
 * POST /api/onboard — keeper create_vault_for(owner), once.
 * Roadmap: K4.2 · Spec: ARCHITECTURE.md §4.1
 * Status: scaffold — not implemented yet.
 */

export async function POST() {
  return NextResponse.json({ error: "Not implemented (K4.2)" }, { status: 501 });
}
