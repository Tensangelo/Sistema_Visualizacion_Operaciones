import type { PlainDate } from "@/domain/operations/Operation";

export type ExcelDateSystem = "1900" | "1904";

export class ExcelDateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExcelDateError";
  }
}

function createPlainDate(year: number, month: number, day: number): PlainDate {
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new ExcelDateError("El año debe estar entre 0001 y 9999.");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new ExcelDateError("El mes no es válido.");
  }

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1];
  if (daysInMonth === undefined || !Number.isInteger(day) || day < 1 || day > daysInMonth) {
    throw new ExcelDateError("El día no existe en el mes indicado.");
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` as PlainDate;
}

function parseIsoDate(value: string): PlainDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new ExcelDateError(
      "La fecha textual debe usar el formato ISO YYYY-MM-DD; otros formatos pueden ser ambiguos.",
    );
  }
  return createPlainDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

function parseExcelSerial(serial: number, system: ExcelDateSystem): PlainDate {
  if (!Number.isFinite(serial) || serial < 0) {
    throw new ExcelDateError("El serial de Excel debe ser un número no negativo.");
  }

  const wholeDays = Math.floor(serial);
  if (system === "1900" && wholeDays === 0) {
    throw new ExcelDateError("El serial 0 no representa una fecha válida en el sistema 1900.");
  }
  if (system === "1900" && wholeDays === 60) {
    throw new ExcelDateError("El serial 60 corresponde al día ficticio 29-02-1900 de Excel.");
  }

  // The 1900 calendar reserves the nonexistent 1900-02-29, shifting day numbers after it.
  const epoch = system === "1904" ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 31);
  const adjustedDays = system === "1900" && wholeDays > 60 ? wholeDays - 1 : wholeDays;
  const date = new Date(epoch + adjustedDays * 86_400_000);
  if (!Number.isFinite(date.getTime())) {
    throw new ExcelDateError("El serial de Excel está fuera del rango admitido.");
  }
  return createPlainDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function parseExcelDate(
  value: unknown,
  system: ExcelDateSystem,
): PlainDate {
  if (typeof value === "number") return parseExcelSerial(value, system);
  if (typeof value === "string" && value.trim() !== "") return parseIsoDate(value.trim());
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return createPlainDate(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate(),
    );
  }
  throw new ExcelDateError("La fecha está vacía o tiene un tipo no admitido.");
}
