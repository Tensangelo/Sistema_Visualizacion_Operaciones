import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  calculateSlaComplianceRate,
  calculateTotalCost,
  calculateTotalMargin,
  calculateTotalRevenue,
  filterOperations,
} from "@/domain/operations/Metrics";
import { importOperationsFromBuffer } from "@/infrastructure/excel/ImportOperations";

describe("supplied Unatrans workbook", () => {
  it.skipIf(!existsSync(new URL("../../public/Datos_Sinteticos_Prueba_Tecnica_Unatrans.xlsx", import.meta.url)))(
    "matches the verified operational totals and zone count",
    async () => {
    const fileBytes = await readFile(
      new URL("../../public/Datos_Sinteticos_Prueba_Tecnica_Unatrans.xlsx", import.meta.url),
    );
    const buffer = Uint8Array.from(fileBytes).buffer;
    const result = await importOperationsFromBuffer(buffer);

    expect(result.status).toBe("complete");
    expect(result.operations).toHaveLength(160);
    expect(calculateTotalRevenue(result.operations)).toEqual([
      { amount: "134350665", currency: "COP" },
    ]);
    expect(calculateTotalCost(result.operations)).toEqual([
      { amount: "104646676", currency: "COP" },
    ]);
    expect(calculateTotalMargin(result.operations)).toEqual([
      { amount: "29703989", currency: "COP" },
    ]);
    expect(calculateSlaComplianceRate(result.operations)).toEqual({
      numerator: 89,
      denominator: 160,
      percentage: (89 / 160) * 100,
    });
    expect(filterOperations(result.operations, { zone: "Bogotá" })).toHaveLength(30);
    expect(
      result.operations.filter((operation) =>
        calculateTotalMargin([operation])[0]?.amount.startsWith("-"),
      ),
    ).toHaveLength(27);
    },
  );
});
