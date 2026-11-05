import type { NextConfig } from "next";
import path from "node:path";

/** Baseline security headers (K8.7). No CSP yet: the wallet connector loads wallet scripts in sandboxed iframes. */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Wallet sign-in may use popups that need to talk back to this window.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
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
