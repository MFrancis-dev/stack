import { describe, expect, it } from "vitest";
import { asBaseUnits, formatAmount, minUnits, parseScaled, toBaseUnits } from "./money";

// Roadmap: K2.1
describe("money", () => {
  it("converts display amounts to base units for 6 and 24 decimals", () => {
    expect(toBaseUnits("12.5", 6)).toBe("12500000");
    expect(toBaseUnits("0.000001", 6)).toBe("1");
    expect(toBaseUnits("100", 6)).toBe("100000000");
    expect(toBaseUnits("1", 24)).toBe("1000000000000000000000000");
  });

  it("rejects too many decimals, negatives and junk", () => {
    expect(() => toBaseUnits("1.0000001", 6)).toThrow();
    expect(() => toBaseUnits("-1", 6)).toThrow();
    expect(() => toBaseUnits("1e6", 6)).toThrow();
    expect(() => asBaseUnits("1.5")).toThrow();
  });

  it("formats base units without float error", () => {
    expect(formatAmount("12500000", 6)).toBe("12.5");
    expect(formatAmount("1", 24)).toBe("0.000000000000000000000001");
    expect(formatAmount("100000000", 6)).toBe("100");
    expect(formatAmount("123456789", 6, 2)).toBe("123.45");
  });

  it("handles 0 and values beyond 2^64", () => {
    expect(formatAmount("0", 6)).toBe("0");
    const big = (2n ** 128n).toString();
    expect(asBaseUnits(big)).toBe(big);
    expect(toBaseUnits(formatAmount(big, 6), 6)).toBe(big);
  });

  it("parses scaled decimals and picks the smaller amount", () => {
    expect(parseScaled("99.9629", 4)).toBe(999629n);
    expect(parseScaled("1.123456789", 3)).toBe(1123n);
    expect(minUnits(asBaseUnits("5"), asBaseUnits("7"))).toBe("5");
  });
});
