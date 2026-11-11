import type { CurrencyCode } from "@/domain/money/Money";

const ISO_CURRENCY_CODES = new Set(Intl.supportedValuesOf("currency"));

export function parseCurrencyCode(value: unknown): CurrencyCode {
  if (
    typeof value !== "string" ||
    !/^[A-Z]{3}$/.test(value) ||
    !ISO_CURRENCY_CODES.has(value)
  ) {
    throw new RangeError("El código de moneda no es un código ISO 4217 admitido.");
  }
  return value;
}
