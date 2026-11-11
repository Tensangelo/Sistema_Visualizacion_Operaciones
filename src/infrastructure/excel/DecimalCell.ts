import type { DecimalAmount } from "@/domain/money/Money";

const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/;
const MAX_DECIMAL_DIGITS = 64;
const MAX_DECIMAL_SCALE = 18;

function expandExponent(value: string): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/.exec(value);
  if (!match) return value;

  const sign = match[1] ?? "";
  const integer = match[2] ?? "";
  const fraction = match[3] ?? "";
  const exponent = Number(match[4]);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > MAX_DECIMAL_DIGITS) {
    throw new RangeError("El exponente supera la precisión máxima admitida.");
  }
  const digits = `${integer}${fraction}`;
  const decimalPoint = integer.length + exponent;
  if (decimalPoint <= 0) return `${sign}0.${"0".repeat(-decimalPoint)}${digits}`;
  if (decimalPoint >= digits.length) {
    return `${sign}${digits}${"0".repeat(decimalPoint - digits.length)}`;
  }
  return `${sign}${digits.slice(0, decimalPoint)}.${digits.slice(decimalPoint)}`;
}

export function parseDecimalCell(value: unknown): DecimalAmount {
  let decimal: string;
  if (typeof value === "number" && Number.isFinite(value)) {
    decimal = value.toString();
  } else if (typeof value === "string" && value.trim() !== "") {
    decimal = value.trim();
  } else {
    throw new RangeError("El importe debe ser un número finito no vacío.");
  }

  if (decimal.length > MAX_DECIMAL_DIGITS + MAX_DECIMAL_SCALE + 2) {
    throw new RangeError("El importe supera la precisión máxima admitida.");
  }
  decimal = expandExponent(decimal);
  if (!DECIMAL_PATTERN.test(decimal)) {
    throw new RangeError("El importe no tiene una representación decimal válida.");
  }
  const unsignedDecimal = decimal.startsWith("-") ? decimal.slice(1) : decimal;
  const [integerPart = "", fractionalPart = ""] = unsignedDecimal.split(".");
  if (integerPart.length + fractionalPart.length > MAX_DECIMAL_DIGITS) {
    throw new RangeError("El importe supera la precisión máxima admitida.");
  }
  if (fractionalPart.length > MAX_DECIMAL_SCALE) {
    throw new RangeError("El importe supera la escala decimal máxima admitida.");
  }
  return decimal;
}
