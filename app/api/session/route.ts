import { NextResponse } from "next/server";

/**
 * POST /api/session — sign in with a NEP-413 signed message.
 * Roadmap: K4.1 · Spec: ARCHITECTURE.md §4.1
 * Status: scaffold — not implemented yet.
 */

export async function POST() {
  return NextResponse.json({ error: "Not implemented (K4.1)" }, { status: 501 });
}
