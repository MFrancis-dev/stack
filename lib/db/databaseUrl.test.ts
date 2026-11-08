import { describe, expect, it } from "vitest";
import { databaseUrlFor } from "./client";

// Roadmap: K13.5
const PROD = "postgres://prod";
const PREVIEW = "postgres://preview";

describe("databaseUrlFor", () => {
  it("uses DATABASE_URL in production on Vercel, and locally", () => {
    expect(databaseUrlFor({ VERCEL: "1", VERCEL_ENV: "production", DATABASE_URL: PROD })).toBe(PROD);
    expect(databaseUrlFor({ DATABASE_URL: PROD })).toBe(PROD);
  });

  it("never gives a preview or development deployment the production database", () => {
    expect(databaseUrlFor({ VERCEL: "1", VERCEL_ENV: "preview", DATABASE_URL: PROD })).toBeUndefined();
    expect(databaseUrlFor({ VERCEL: "1", VERCEL_ENV: "development", DATABASE_URL: PROD })).toBeUndefined();
    expect(databaseUrlFor({ VERCEL: "1", VERCEL_ENV: "preview", DATABASE_URL: PROD, PREVIEW_DATABASE_URL: PREVIEW })).toBe(PREVIEW);
  });

  it("falls back to the embedded database when nothing is set locally", () => {
    expect(databaseUrlFor({ DATABASE_URL: "" })).toBeUndefined();
  });
});
