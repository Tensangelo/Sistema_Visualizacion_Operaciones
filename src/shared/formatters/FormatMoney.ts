import type { Money } from "@/domain/money/Money";

const digitMaps = new Map<string, readonly string[]>();

function localizedDigits(locale: string): readonly string[] {
  const cached = digitMaps.get(locale);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(locale, { useGrouping: false });
  const digits = Array.from({ length: 10 }, (_, digit) =>
    formatter.format(BigInt(digit)),
  );
  digitMaps.set(locale, digits);
  return digits;
}

export function formatMoney(value: Money, locale = "es-CO"): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value.amount);
  if (!match) return `${value.amount} ${value.currency}`;

  const [, sign, integerDigits, fractionDigits = ""] = match;
  const signedInteger = BigInt(`${sign}${integerDigits}`);
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: value.currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
  const parts = formatter.formatToParts(
    sign === "-" && signedInteger === 0n ? -1n : signedInteger,
  );
  if (sign === "-" && signedInteger === 0n) {
    const zero = localizedDigits(locale)[0] ?? "0";
    const integerPart = parts.find(({ type }) => type === "integer");
    if (integerPart) integerPart.value = zero;
  }
  if (fractionDigits.length === 0) return parts.map(({ value: part }) => part).join("");

  const localeParts = new Intl.NumberFormat(locale).formatToParts(1.1);
  const decimalSeparator = localeParts.find(({ type }) => type === "decimal")?.value ?? ".";
  const digits = localizedDigits(locale);
  const localizedFraction = [...fractionDigits]
    .map((digit) => digits[Number(digit)] ?? digit)
    .join("");
  const lastIntegerPart = parts.findLastIndex(({ type }) => type === "integer");

  if (lastIntegerPart < 0) {
    return `${parts.map(({ value: part }) => part).join("")}${decimalSeparator}${localizedFraction}`;
  }

  parts.splice(lastIntegerPart + 1, 0, {
    type: "decimal",
    value: decimalSeparator,
  }, {
    type: "fraction",
    value: localizedFraction,
  });
  return parts.map(({ value: part }) => part).join("");
}
