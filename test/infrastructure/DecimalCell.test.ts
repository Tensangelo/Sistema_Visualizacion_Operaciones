import { describe, expect, it } from "vitest";
import { parseDecimalCell } from "@/infrastructure/excel/DecimalCell";

describe("parseDecimalCell", () => {
  it("preserves integer, decimal, negative, and small exponent values as decimal strings", () => {
    expect(parseDecimalCell(1200)).toBe("1200");
    expect(parseDecimalCell(12.34)).toBe("12.34");
    expect(parseDecimalCell("-0.1250")).toBe("-0.1250");
    expect(parseDecimalCell(1e-7)).toBe("0.0000001");
  });

  it.each([
    "",
    "  ",
    "12,34",
    "NaN",
    Number.NaN,
    Number.POSITIVE_INFINITY,
    null,
    "0." + "1".repeat(19),
  ])(
    "rejects invalid money values: %s",
    (value) => {
      expect(() => parseDecimalCell(value)).toThrow();
    },
  );
});
