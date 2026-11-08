/**
 * Caps for the demo routes (K13.6). Counted in Postgres by `rateLimit`, so they hold across every
 * serverless instance. A demo user lives for a day (worker/cleanupDemo.ts).
 * Roadmap: K13.6
 */

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export const DEMO_LIMITS = {
  startPerIpMinute: 10,
  startPerIpHour: 30,
  startAllHour: 600,
  fastForwardPerDemo: 12,
  resetPerDemo: 20,
  ownerTxPerDemoHour: 60,
} as const;
