import type { ImportOperationsResult } from "@/infrastructure/excel/ImportResult";
import { normalizeOperationRows } from "@/infrastructure/excel/NormalizeOperations";
import type { ExcelDateSystem } from "@/infrastructure/excel/ParseExcelDate";

export const MAX_EXCEL_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_WORKSHEET_ROWS = 10_001;
const MAX_WORKSHEET_COLUMNS = 64;

function failedImport(message: string): ImportOperationsResult {
  return {
    status: "failed",
    totalRows: 0,
    operations: [],
    errors: [{ row: null, field: null, message }],
    warnings: [],
    rejectedRows: 0,
  };
}

function hasZipSignature(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 4));
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function dateSystemForWorkbook(workbook: {
  Workbook?: { WBProps?: { date1904?: boolean } };
}): ExcelDateSystem {
  return workbook.Workbook?.WBProps?.date1904 ? "1904" : "1900";
}

export async function importOperationsFromBuffer(
  buffer: ArrayBuffer,
): Promise<ImportOperationsResult> {
  if (buffer.byteLength === 0) return failedImport("El archivo está vacío.");
  if (buffer.byteLength > MAX_EXCEL_FILE_SIZE_BYTES) {
    return failedImport("El archivo excede el límite de 10 MiB.");
  }
  if (!hasZipSignature(buffer)) {
    return failedImport("El contenido no parece ser un archivo XLSX válido.");
  }

  try {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: false,
      cellFormula: false,
      dense: true,
    });
    if (!workbook.SheetNames.includes("Datos")) {
      return failedImport("El archivo no contiene la hoja obligatoria Datos.");
    }

    const worksheet = workbook.Sheets.Datos;
    const reference = worksheet?.["!ref"];
    if (!worksheet || !reference) {
      return failedImport("La hoja Datos está vacía o no tiene un rango legible.");
    }

    const range = XLSX.utils.decode_range(reference);
    const rowCount = range.e.r - range.s.r + 1;
    const columnCount = range.e.c - range.s.c + 1;
    if (
      range.s.r !== 0 ||
      range.s.c !== 0 ||
      rowCount > MAX_WORKSHEET_ROWS ||
      columnCount > MAX_WORKSHEET_COLUMNS
    ) {
      return failedImport(
        "La hoja Datos debe comenzar en A1 y no superar 10.000 filas ni 64 columnas.",
      );
    }

    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    });
    return normalizeOperationRows(rows, dateSystemForWorkbook(workbook));
  } catch {
    return failedImport("No fue posible leer el archivo XLSX. Verifica que no esté dañado.");
  }
}

export async function importOperationsFile(
  file: Pick<File, "name" | "size" | "arrayBuffer">,
): Promise<ImportOperationsResult> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return failedImport("Selecciona un archivo con extensión .xlsx.");
  }
  if (file.size > MAX_EXCEL_FILE_SIZE_BYTES) {
    return failedImport("El archivo excede el límite de 10 MiB.");
  }

  try {
    return await importOperationsFromBuffer(await file.arrayBuffer());
  } catch {
    return failedImport("No fue posible leer el archivo local.");
  }
}
