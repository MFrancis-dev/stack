/**
 * Prints which env vars real (non-demo) mode still needs. Never prints values.
 * Roadmap: K0.6 · Run: pnpm check-env
 */

import { missingForRealMode, REQUIRED_FOR_REAL_MODE } from "../lib/server/env";

const missing = missingForRealMode();

if (missing.length === 0) {
  console.log(`check-env: all ${REQUIRED_FOR_REAL_MODE.length} variables for real mode are set.`);
} else {
  console.log("check-env: demo mode works without these, but real mode needs:");
  for (const name of missing) console.log(`  - ${name}`);
  process.exitCode = 1;
}
