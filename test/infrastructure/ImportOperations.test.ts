import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { REQUIRED_HEADERS } from "@/infrastructure/excel/NormalizeOperations";
import {
  MAX_EXCEL_FILE_SIZE_BYTES,
  importOperationsFile,
  importOperationsFromBuffer,
} from "@/infrastructure/excel/ImportOperations";

type SourceRow = Record<(typeof REQUIRED_HEADERS)[number], unknown>;

function sourceRow(overrides: Partial<SourceRow> = {}): SourceRow {
  return {
    ID_Operacion: "OP-001",
    Fecha: 46000,
    Zona: "Bogotá",
    Ruta: "Bogotá - Cali",
    Tipo_Servicio: "Carga",
    Cliente_Anonimizado: "Cliente ficticio",
    Vehiculo_Codigo: "VH-01",
    Kilometros: 420,
    Horas_Planeadas: 8.5,
    Horas_Reales: 9,
    Estado: "Con novedad",
    Cumplimiento_SLA: "No",
    Ingresos_COP: 1250.75,
    Costos_COP: 500.25,
    Margen_COP: 750.5,
    Calificacion_Servicio_1a5: 4,
    ...overrides,
  };
}

function toArrayBuffer(value: unknown): ArrayBuffer {
  if (value instanceof ArrayBuffer) return value;
  if (ArrayBuffer.isView(value)) {
    const bytes = new Uint8Array(value.byteLength);
    bytes.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
    return bytes.buffer;
  }
  throw new Error("SheetJS did not return an array buffer.");
}

function createWorkbookBuffer(
  rows: readonly (readonly unknown[])[],
  options: { readonly sheetName?: string; readonly date1904?: boolean } = {},
): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows.map((row) => [...row]));
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName ?? "Datos");
  workbook.Workbook = { WBProps: { date1904: options.date1904 ?? false } };
  const output: unknown = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return toArrayBuffer(output);
}

function rowsFor(...sourceRows: SourceRow[]): unknown[][] {
  return [
    [...REQUIRED_HEADERS],
    ...sourceRows.map((row) => REQUIRED_HEADERS.map((header) => row[header])),
  ];
}

describe("Excel operations import", () => {
  it("parses a real XLSX buffer and preserves normalized operational fields", async () => {
    const buffer = createWorkbookBuffer(rowsFor(sourceRow()));
    const result = await importOperationsFromBuffer(buffer);

    expect(result.status).toBe("complete");
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.rejectedRows).toBe(0);
    expect(result.operations).toEqual([
      {
        id: "OP-001",
        date: "2025-12-09",
        zone: "Bogotá",
        route: "Bogotá - Cali",
        serviceType: "Carga",
        anonymizedCustomer: "Cliente ficticio",
        vehicleCode: "VH-01",
        kilometers: 420,
        plannedHours: 8.5,
        actualHours: 9,
        status: "incident",
        slaCompliant: false,
        revenue: { amount: "1250.75", currency: "COP" },
        cost: { amount: "500.25", currency: "COP" },
        reportedMargin: { amount: "750.5", currency: "COP" },
        serviceRating: 4,
      },
    ]);
  });

  it("uses the workbook 1904 date system when it is declared", async () => {
    const source = sourceRow({ Fecha: 0 });
    const buffer = createWorkbookBuffer(rowsFor(source), { date1904: true });
    const result = await importOperationsFromBuffer(buffer);
    expect(result.operations[0]?.date).toBe("1904-01-01");
  });

  it("reports exact declared-versus-calculated margin discrepancies as warnings", async () => {
    const buffer = createWorkbookBuffer(
      rowsFor(sourceRow({ Margen_COP: "750.50" })),
    );
    const result = await importOperationsFromBuffer(buffer);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);

    const mismatchBuffer = createWorkbookBuffer(
      rowsFor(sourceRow({ Margen_COP: "750.49" })),
    );
    const mismatch = await importOperationsFromBuffer(mismatchBuffer);
    expect(mismatch.operations[0]?.reportedMargin).toEqual({
      amount: "750.49",
      currency: "COP",
    });
    expect(mismatch.warnings).toEqual([
      {
        row: 2,
        field: "Margen_COP",
        message: "El margen informado no coincide con ingresos menos costos.",
        declaredValue: "750.49",
        calculatedValue: "750.5",
      },
    ]);
  });

  it("reports both rows of a duplicate ID and excludes them from normalized operations", async () => {
    const buffer = createWorkbookBuffer(
      rowsFor(sourceRow(), sourceRow({ Zona: "Antioquia" })),
    );
    const result = await importOperationsFromBuffer(buffer);
    expect(result.status).toBe("partial");
    expect(result.operations).toEqual([]);
    expect(result.rejectedRows).toBe(2);
    expect(result.errors.map(({ row, field }) => ({ row, field }))).toEqual([
      { row: 2, field: "ID_Operacion" },
      { row: 3, field: "ID_Operacion" },
    ]);
  });

  it("does not retain a duplicate ID if one occurrence has another invalid field", async () => {
    const buffer = createWorkbookBuffer(
      rowsFor(sourceRow(), sourceRow({ Ingresos_COP: "invalid" })),
    );
    const result = await importOperationsFromBuffer(buffer);
    expect(result.operations).toEqual([]);
    expect(result.rejectedRows).toBe(2);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ row: 3, field: "Ingresos_COP" }),
    );
    expect(result.errors.filter(({ field }) => field === "ID_Operacion")).toHaveLength(2);
  });

  it.each([
    ["Estado", "Desconocido"],
    ["Cumplimiento_SLA", "Quizás"],
    ["ID_Operacion", ""],
    ["Kilometros", Number.NaN],
    ["Ingresos_COP", ""],
    ["Fecha", "03/04/2026"],
    ["Zona", ""],
  ])("reports an invalid row field %s", async (field, value) => {
    const row = sourceRow({ [field]: value });
    const result = await importOperationsFromBuffer(
      createWorkbookBuffer(rowsFor(row)),
    );
    expect(result.operations).toEqual([]);
    expect(result.rejectedRows).toBe(1);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ row: 2, field }),
    );
  });

  it("rejects missing required columns and missing Datos worksheets", async () => {
    const missingColumnRows = rowsFor(sourceRow()).map((row) =>
      row.filter((_, index) => REQUIRED_HEADERS[index] !== "Ruta"),
    );
    const missingColumn = await importOperationsFromBuffer(
      createWorkbookBuffer(missingColumnRows),
    );
    expect(missingColumn.errors).toContainEqual(
      expect.objectContaining({ row: 1, field: "Ruta" }),
    );
    expect(missingColumn.status).toBe("failed");

    const wrongSheet = await importOperationsFromBuffer(
      createWorkbookBuffer(rowsFor(sourceRow()), { sheetName: "Operaciones" }),
    );
    expect(wrongSheet.errors[0]?.message).toMatch(/hoja obligatoria Datos/);
  });

  it("handles a header-only sheet, corrupt content, and invalid extensions", async () => {
    const empty = await importOperationsFromBuffer(
      createWorkbookBuffer([[...REQUIRED_HEADERS]]),
    );
    expect(empty.operations).toEqual([]);
    expect(empty.errors).toEqual([]);

    const corrupt = await importOperationsFromBuffer(new Uint8Array([1, 2, 3]).buffer);
    expect(corrupt.status).toBe("failed");
    expect(corrupt.errors[0]?.message).toMatch(/XLSX válido/);

    const malformedZip = await importOperationsFromBuffer(
      new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer,
    );
    expect(malformedZip.errors[0]?.message).toMatch(/dañado/);

    const invalidExtension = await importOperationsFile({
      name: "operations.xls",
      size: 100,
      arrayBuffer: async () => new ArrayBuffer(0),
    });
    expect(invalidExtension.errors[0]?.message).toMatch(/\.xlsx/);
  });

  it("imports a selected local file without relying on its MIME type", async () => {
    const buffer = createWorkbookBuffer(rowsFor(sourceRow()));
    const result = await importOperationsFile({
      name: "cualquier-nombre.xlsx",
      size: buffer.byteLength,
      arrayBuffer: async () => buffer,
    });
    expect(result.operations).toHaveLength(1);
  });

  it("rejects files over the configured size limit before reading them", async () => {
    let bufferWasRead = false;
    const result = await importOperationsFile({
      name: "oversized.xlsx",
      size: MAX_EXCEL_FILE_SIZE_BYTES + 1,
      arrayBuffer: async () => {
        bufferWasRead = true;
        return new ArrayBuffer(0);
      },
    });
    expect(result.errors[0]?.message).toMatch(/10 MiB/);
    expect(bufferWasRead).toBe(false);
  });
});
