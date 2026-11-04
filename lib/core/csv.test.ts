import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

// Roadmap: K4.6
describe("csv", () => {
  it("quotes commas, quotes and newlines; leaves numbers alone", () => {
    expect(toCsv(["a", "b"], [["x,y", 'say "hi"'], ["line\nbreak", -5], [null, undefined]])).toBe(
      'a,b\r\n"x,y","say ""hi"""\r\n"line\nbreak",-5\r\n,\r\n',
    );
  });

  it("neutralises spreadsheet formulas", () => {
    expect(toCsv(["a"], [["=HYPERLINK(1)"], ["@cmd"], ["-12.5"]])).toBe("a\r\n'=HYPERLINK(1)\r\n'@cmd\r\n-12.5\r\n");
  });
});
