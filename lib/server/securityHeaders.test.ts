import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

// Roadmap: K8.7, K13.9
describe("security headers", () => {
  it("enforces the CSP directives that can't break wallets, and reports the full policy", async () => {
    const [rule] = await nextConfig.headers!();
    const h = Object.fromEntries(rule!.headers.map((x) => [x.key, x.value]));
    expect(h["Content-Security-Policy"]).toBe("object-src 'none'; frame-ancestors 'none'");
    const reportOnly = h["Content-Security-Policy-Report-Only"]!;
    for (const d of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"]) {
      expect(reportOnly).toContain(d);
    }
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
  });
});
