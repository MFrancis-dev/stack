/**
 * Prepares the local PGlite database for `pnpm demo` (migrations only). Each visitor gets their own demo
 * data when they press "Open the demo", so nothing is shared between visitors.
 * Roadmap: K7.3
 */

import { createDb } from "../lib/db/client";

const db = createDb({ databaseUrl: process.env.DATABASE_URL || undefined });
await db.migrate();
console.log("demo: database ready — open http://localhost:3000/demo");
process.exit(0);
