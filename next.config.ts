import type { NextConfig } from "next";
import path from "node:path";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy (K13.9). Wallets run in `srcdoc` sandbox frames, which inherit this policy,
 * and wallet sign-in can't be tested without a real wallet. So only directives that can't touch
 * wallet code are enforced; the full policy is report-only (violations show in the browser console)
 * until a real-wallet sign-in shows none, then it moves to the enforced header.
 */
const CSP_ENFORCED = ["object-src 'none'", "frame-ancestors 'none'"].join("; ");
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  // Next.js inlines its bootstrap scripts; dev mode also needs eval for fast refresh.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self'",
  // The wallet connector fetches its wallet list and talks to wallets and NEAR RPC over https/wss.
  "connect-src 'self' https: wss:",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/** Baseline security headers (K8.7, K13.9). */
const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP_ENFORCED },
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Wallet sign-in may use popups that need to talk back to this window.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // This folder is the project root, even if a stray lockfile exists higher up on the machine.
  outputFileTracingRoot: path.resolve(import.meta.dirname),
  // Migrations are read from disk at runtime (db.migrate()); serverless bundles only include imported
  // files, so ship the SQL explicitly.
  outputFileTracingIncludes: { "/api/**/*": ["./drizzle/**/*"] },
  // PGlite loads its WebAssembly via import.meta.url; bundling breaks that, so Node loads it directly.
  serverExternalPackages: ["@electric-sql/pglite"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
