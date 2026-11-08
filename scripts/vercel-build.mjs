// Vercel build (K13.5): only production builds migrate the database. Preview and Development builds
// get the production DATABASE_URL from the Neon integration too, and must never change it.
import { execSync } from "node:child_process";

const env = process.env.VERCEL_ENV ?? "local";
if (env === "production") {
  execSync("drizzle-kit migrate", { stdio: "inherit" });
} else {
  console.log(`Skipping database migrations on a ${env} build: only production migrates its database.`);
}
execSync("next build", { stdio: "inherit" });
