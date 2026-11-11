import { subtractMoney } from "@/domain/money/Decimal";
import type { Money } from "@/domain/money/Money";
import type { Operation, PlainDate, OperationStatus } from "@/domain/operations/Operation";
import { z } from "zod";
import { parseCurrencyCode } from "@/infrastructure/excel/CurrencyCode";
import { parseDecimalCell } from "@/infrastructure/excel/DecimalCell";
import type { ExcelDateSystem } from "@/infrastructure/excel/ParseExcelDate";
import { ExcelDateError, parseExcelDate } from "@/infrastructure/excel/ParseExcelDate";
import type { ImportIssue, ImportOperationsResult, ImportWarning } from "@/infrastructure/excel/ImportResult";

export const REQUIRED_HEADERS = [
  "ID_Operacion",
  "Fecha",
  "Zona",
  "Ruta",
  "Tipo_Servicio",
  "Cliente_Anonimizado",
  "Vehiculo_Codigo",
  "Kilometros",
  "Horas_Planeadas",
  "Horas_Reales",
  "Estado",
  "Cumplimiento_SLA",
  "Ingresos_COP",
  "Costos_COP",
  "Margen_COP",
  "Calificacion_Servicio_1a5",
] as const;

interface RowCandidate {
  readonly rowNumber: number;
  readonly operation: Operation;
  readonly warning?: ImportWarning;
}

const text = z.string().trim().min(1, "El campo es obligatorio.");
const finiteNumber = z.number().finite("Debe ser un número finito.");

const sourceRowSchema = z.object({
  ID_Operacion: text,
  Fecha: z.unknown(),
  Zona: text,
  Ruta: text,
  Tipo_Servicio: text,
  Cliente_Anonimizado: text,
  Vehiculo_Codigo: text,
  Kilometros: finiteNumber.min(0),
  Horas_Planeadas: finiteNumber.min(0),
  Horas_Reales: finiteNumber.min(0),
  Estado: z.enum(["Completado", "Con novedad", "Cancelado"]),
  Cumplimiento_SLA: z.enum(["Sí", "No"]),
  Ingresos_COP: z.unknown(),
  Costos_COP: z.unknown(),
  Margen_COP: z.unknown(),
  Calificacion_Servicio_1a5: finiteNumber.min(1).max(5),
});

const STATUS_MAP: Record<string, OperationStatus> = {
  Completado: "completed",
  "Con novedad": "incident",
  Cancelado: "cancelled",
};

const COP = parseCurrencyCode("COP");

function createMoney(value: unknown, field: string, row: number, errors: ImportIssue[]): Money | null {
  try {
    return { amount: parseDecimalCell(value), currency: COP };
  } catch (error) {
    errors.push({
      row,
      field,
      message: error instanceof Error ? error.message : "El importe no es válido.",
    });
    return null;
  }
}

function toSourceRow(
  headers: readonly unknown[],
  values: readonly unknown[],
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const requiredHeader of REQUIRED_HEADERS) {
    const index = headers.findIndex(
      (header) => typeof header === "string" && header.trim() === requiredHeader,
    );
    row[requiredHeader] = values[index];
  }
  return row;
}

function createCandidate(
  rowData: Record<string, unknown>,
  rowNumber: number,
  dateSystem: ExcelDateSystem,
  errors: ImportIssue[],
): RowCandidate | null {
  const parsed = sourceRowSchema.safeParse(rowData);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "fila");
      errors.push({ row: rowNumber, field, message: issue.message });
    }
    return null;
  }

  const row = parsed.data;
  let date: PlainDate | undefined;
  try {
    date = parseExcelDate(row.Fecha, dateSystem);
  } catch (error) {
    errors.push({
      row: rowNumber,
      field: "Fecha",
      message: error instanceof ExcelDateError ? error.message : "La fecha no es válida.",
    });
  }

  const rowErrors: ImportIssue[] = [];
  const revenue = createMoney(row.Ingresos_COP, "Ingresos_COP", rowNumber, rowErrors);
  const cost = createMoney(row.Costos_COP, "Costos_COP", rowNumber, rowErrors);
  const reportedMargin = createMoney(row.Margen_COP, "Margen_COP", rowNumber, rowErrors);
  errors.push(...rowErrors);

  if (!date || !revenue || !cost || !reportedMargin) return null;

  const calculatedMargin = subtractMoney(revenue, cost);
  const marginDifference = subtractMoney(reportedMargin, calculatedMargin);
  const warning = marginDifference.amount === "0"
    ? undefined
    : {
        row: rowNumber,
        field: "Margen_COP",
        message: "El margen informado no coincide con ingresos menos costos.",
        declaredValue: reportedMargin.amount,
        calculatedValue: calculatedMargin.amount,
      };

  return {
    rowNumber,
    operation: {
      id: row.ID_Operacion,
      date,
      zone: row.Zona,
      route: row.Ruta,
      serviceType: row.Tipo_Servicio,
      anonymizedCustomer: row.Cliente_Anonimizado,
      vehicleCode: row.Vehiculo_Codigo,
      kilometers: row.Kilometros,
      plannedHours: row.Horas_Planeadas,
      actualHours: row.Horas_Reales,
      status: STATUS_MAP[row.Estado],
      slaCompliant: row.Cumplimiento_SLA === "Sí",
      revenue,
      cost,
      reportedMargin,
      serviceRating: row.Calificacion_Servicio_1a5,
    },
    warning,
  };
}

function validateHeaders(headers: readonly unknown[]): ImportIssue[] {
  const errors: ImportIssue[] = [];
  const normalizedHeaders = headers.map((header) =>
    typeof header === "string" ? header.trim() : "",
  );
  const duplicates = new Set<string>();
  normalizedHeaders.forEach((header, index) => {
    if (header && normalizedHeaders.indexOf(header) !== index) duplicates.add(header);
  });
  for (const duplicate of duplicates) {
    errors.push({ row: 1, field: duplicate, message: "El encabezado está duplicado." });
  }
  for (const requiredHeader of REQUIRED_HEADERS) {
    if (!normalizedHeaders.includes(requiredHeader)) {
      errors.push({
        row: 1,
        field: requiredHeader,
        message: "Falta una columna obligatoria.",
      });
    }
  }
  return errors;
}

export function normalizeOperationRows(
  rows: readonly (readonly unknown[])[],
  dateSystem: ExcelDateSystem,
): ImportOperationsResult {
  const [headers, ...dataRows] = rows;
  if (!headers) {
    return {
      status: "failed",
      totalRows: 0,
      operations: [],
      errors: [{ row: 1, field: null, message: "La hoja Datos está vacía." }],
      warnings: [],
      rejectedRows: 0,
    };
  }

  const headerErrors = validateHeaders(headers);
  if (headerErrors.length > 0) {
    return {
      status: "failed",
      totalRows: 0,
      operations: [],
      errors: headerErrors,
      warnings: [],
      rejectedRows: 0,
    };
  }

  const sourceRows = dataRows.flatMap((values, index) =>
    values.every((value) => value === null || value === undefined || value === "")
      ? []
      : [{ values, rowNumber: index + 2 }],
  );
  const candidates: RowCandidate[] = [];
  const errors: ImportIssue[] = [];
  const idColumnIndex = headers.findIndex(
    (header) => typeof header === "string" && header.trim() === "ID_Operacion",
  );
  const sourceIds = new Map<string, number[]>();
  sourceRows.forEach(({ values, rowNumber }) => {
    const id = values[idColumnIndex];
    if (typeof id !== "string" || id.trim() === "") return;
    const matchingRows = sourceIds.get(id.trim()) ?? [];
    matchingRows.push(rowNumber);
    sourceIds.set(id.trim(), matchingRows);
  });
  const duplicateRows = new Set<number>();
  for (const [id, matchingRows] of sourceIds) {
    if (matchingRows.length < 2) continue;
    for (const row of matchingRows) {
      duplicateRows.add(row);
      errors.push({
        row,
        field: "ID_Operacion",
        message: `El identificador ${id} está duplicado.`,
      });
    }
  }

  sourceRows.forEach(({ values, rowNumber }) => {
    const candidate = createCandidate(
      toSourceRow(headers, values),
      rowNumber,
      dateSystem,
      errors,
    );
    if (candidate) candidates.push(candidate);
  });

  const warnings = candidates.flatMap((candidate) =>
    candidate.warning ? [candidate.warning] : [],
  );
  const operations = candidates
    .filter((candidate) => !duplicateRows.has(candidate.rowNumber))
    .map(({ operation }) => operation);
  const rejectedRows = new Set(errors.map(({ row }) => row).filter((row) => row !== null));

  return {
    status: errors.length > 0 ? "partial" : "complete",
    totalRows: sourceRows.length,
    operations,
    errors,
    warnings,
    rejectedRows: rejectedRows.size,
  };
}
