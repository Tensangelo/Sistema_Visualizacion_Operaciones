import type { CurrencyCode, Money } from "@/domain/money/Money";

interface ParsedDecimal {
  readonly coefficient: bigint;
  readonly scale: number;
}

function parseDecimal(amount: string): ParsedDecimal {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(amount);
  if (!match) {
    throw new RangeError(`Invalid decimal amount: ${amount}`);
  }

  const fraction = match[3] ?? "";
  const sign = match[1] === "-" ? -1n : 1n;
  return {
    coefficient: sign * BigInt(`${match[2]}${fraction}`),
    scale: fraction.length,
  };
}

function powerOfTen(scale: number): bigint {
  return 10n ** BigInt(scale);
}

function formatDecimal(coefficient: bigint, scale: number): string {
  const negative = coefficient < 0n;
  const digits = (negative ? -coefficient : coefficient)
    .toString()
    .padStart(scale + 1, "0");
  const integer = scale === 0 ? digits : digits.slice(0, -scale);
  const fraction = scale === 0 ? "" : digits.slice(-scale).replace(/0+$/, "");
  const sign = negative && coefficient !== 0n ? "-" : "";
  return fraction ? `${sign}${integer}.${fraction}` : `${sign}${integer}`;
}

function combineMoney(left: Money, right: Money, subtract: boolean): Money {
  if (left.currency !== right.currency) {
    throw new RangeError(
      `Cannot combine ${left.currency} with ${right.currency} without conversion`,
    );
  }

  const leftDecimal = parseDecimal(left.amount);
  const rightDecimal = parseDecimal(right.amount);
  const scale = Math.max(leftDecimal.scale, rightDecimal.scale);
  const leftCoefficient =
    leftDecimal.coefficient * powerOfTen(scale - leftDecimal.scale);
  const rightCoefficient =
    rightDecimal.coefficient * powerOfTen(scale - rightDecimal.scale);
  const coefficient = subtract
    ? leftCoefficient - rightCoefficient
    : leftCoefficient + rightCoefficient;

  return {
    amount: formatDecimal(coefficient, scale),
    currency: left.currency,
  };
}

export function addMoney(left: Money, right: Money): Money {
  return combineMoney(left, right, false);
}

export function subtractMoney(left: Money, right: Money): Money {
  return combineMoney(left, right, true);
}

export function sumMoney(values: readonly Money[]): Money[] {
  const totals = new Map<CurrencyCode, Money>();
  for (const value of values) {
    const current = totals.get(value.currency);
    totals.set(
      value.currency,
      current ? addMoney(current, value) : normalizeMoney(value),
    );
  }
  return [...totals.values()];
}

function normalizeMoney(value: Money): Money {
  const parsed = parseDecimal(value.amount);
  return { amount: formatDecimal(parsed.coefficient, parsed.scale), currency: value.currency };
}
