import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // PGlite loads its WebAssembly via import.meta.url; bundling breaks that, so Node loads it directly.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
