import { describe, expect, it } from "vitest";
import { formatMoney } from "@/shared/formatters/FormatMoney";

describe("formatMoney", () => {
  it("formats very large decimal amounts without converting them to floating point", () => {
    expect(
      formatMoney({ amount: "12345678901234567890.12", currency: "COP" }),
    ).toContain("12.345.678.901.234.567.890,12");
  });

  it("retains negative fractional values below one unit", () => {
    const formatted = formatMoney({ amount: "-0.25", currency: "USD" });
    expect(formatted).toContain("0,25");
    expect(formatted.startsWith("-")).toBe(true);
  });

  it("displays each amount with its own currency", () => {
    const cop = formatMoney({ amount: "100", currency: "COP" });
    const usd = formatMoney({ amount: "100", currency: "USD" });
    expect(cop).not.toBe(usd);
  });
});
