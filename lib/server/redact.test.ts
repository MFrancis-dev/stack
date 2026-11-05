import { describe, expect, it } from "vitest";
import { redact } from "./redact";

// Roadmap: K8.7
describe("redact", () => {
  it("removes sensitive env values, URL credentials and private keys", () => {
    const env = { ONECLICK_JWT: "eyJhbGciOiJIUzI1NiJ9.secret.part", DATABASE_URL: "postgres://app:hunter2@db.example:5432/stack" };
    const msg = `connect failed for postgres://app:hunter2@db.example:5432/stack using eyJhbGciOiJIUzI1NiJ9.secret.part and ed25519:${"3".repeat(80)}`;
    const out = redact(msg, env);
    expect(out).not.toContain("hunter2");
    expect(out).not.toContain("secret.part");
    expect(out).not.toContain("3".repeat(80));
    expect(out).toContain("[DATABASE_URL]");
    expect(out).toContain("ed25519:[private-key]");
  });

  it("leaves ordinary messages and public keys alone", () => {
    expect(redact("No quote available", {})).toBe("No quote available");
    expect(redact("key ed25519:9xQfB3", {})).toBe("key ed25519:9xQfB3");
    expect(redact("see https://nearblocks.io/txns/abc", {})).toBe("see https://nearblocks.io/txns/abc");
  });
});
