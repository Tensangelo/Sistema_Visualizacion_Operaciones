import { describe, expect, it } from "vitest";
import { parseCurrencyCode } from "@/infrastructure/excel/CurrencyCode";

describe("parseCurrencyCode", () => {
  it.each(["COP", "USD", "EUR"])("accepts ISO currency %s", (currency) => {
    expect(parseCurrencyCode(currency)).toBe(currency);
  });

  it.each(["cop", "ZZZ", "US", "USDD", 123, null])(
    "rejects invalid currency code %s",
    (currency) => {
      expect(() => parseCurrencyCode(currency)).toThrow(/ISO 4217/);
    },
  );
});
