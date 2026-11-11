import { describe, expect, it } from "vitest";
import { ExcelDateError, parseExcelDate } from "@/infrastructure/excel/ParseExcelDate";

describe("parseExcelDate", () => {
  it("converts serial dates in the 1900 date system around the leap-year defect", () => {
    expect(parseExcelDate(1, "1900")).toBe("1900-01-01");
    expect(parseExcelDate(59, "1900")).toBe("1900-02-28");
    expect(() => parseExcelDate(0, "1900")).toThrow(ExcelDateError);
    expect(() => parseExcelDate(60, "1900")).toThrow(ExcelDateError);
    expect(parseExcelDate(61, "1900")).toBe("1900-03-01");
  });

  it("uses the 1904 epoch and discards fractional time without timezone shifts", () => {
    expect(parseExcelDate(0, "1904")).toBe("1904-01-01");
    expect(parseExcelDate(1.75, "1904")).toBe("1904-01-02");
  });

  it("accepts strict ISO calendar dates and validates leap days", () => {
    expect(parseExcelDate("2024-02-29", "1900")).toBe("2024-02-29");
    expect(() => parseExcelDate("2023-02-29", "1900")).toThrow(ExcelDateError);
    expect(() => parseExcelDate("2026-04-31", "1900")).toThrow(ExcelDateError);
  });

  it("rejects ambiguous and unsupported textual formats", () => {
    expect(() => parseExcelDate("03/04/2026", "1900")).toThrow(/ISO YYYY-MM-DD/);
    expect(() => parseExcelDate("", "1900")).toThrow(ExcelDateError);
    expect(() => parseExcelDate(Number.NaN, "1900")).toThrow(ExcelDateError);
  });
});
