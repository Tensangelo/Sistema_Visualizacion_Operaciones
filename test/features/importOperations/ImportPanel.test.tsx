// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Operation } from "@/domain/operations/Operation";
import { importOperationsFile } from "@/infrastructure/excel/ImportOperations";
import type { ImportOperationsResult } from "@/infrastructure/excel/ImportResult";
import { OperationsWorkspace } from "@/features/dashboard/components/OperationsWorkspace";

vi.mock("@/infrastructure/excel/ImportOperations", () => ({
  importOperationsFile: vi.fn(),
}));

const mockedImportOperationsFile = vi.mocked(importOperationsFile);

function operation(id: string): Operation {
  return {
    id,
    date: "2026-08-21",
    zone: "Bogotá",
    route: "Bogotá - Cali",
    serviceType: "Carga",
    anonymizedCustomer: "Cliente anónimo",
    vehicleCode: "VH-01",
    kilometers: 420,
    plannedHours: 8,
    actualHours: 8,
    status: "completed",
    slaCompliant: true,
    revenue: { amount: "1000", currency: "COP" },
    cost: { amount: "800", currency: "COP" },
    reportedMargin: { amount: "200", currency: "COP" },
    serviceRating: 5,
  };
}

function completeResult(id: string, totalRows = 1): ImportOperationsResult {
  return {
    status: "complete",
    totalRows,
    operations: Array.from({ length: totalRows }, (_, index) => operation(`${id}-${index}`)),
    errors: [],
    warnings: [],
    rejectedRows: 0,
  };
}

function partialResult(): ImportOperationsResult {
  return {
    status: "partial",
    totalRows: 2,
    operations: [operation("valid-1")],
    errors: [
      { row: 3, field: "Fecha", message: "La fecha no existe." },
    ],
    warnings: [
      {
        row: 2,
        field: "Margen_COP",
        message: "El margen informado no coincide con ingresos menos costos.",
        declaredValue: "100",
        calculatedValue: "200",
      },
    ],
    rejectedRows: 1,
  };
}

function failedResult(message = "No se encontró la hoja Datos."): ImportOperationsResult {
  return {
    status: "failed",
    totalRows: 0,
    operations: [],
    errors: [{ row: null, field: null, message }],
    warnings: [],
    rejectedRows: 0,
  };
}

function excelFile(name: string): File {
  return new File(["local workbook"], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("OperationsWorkspace import flow", () => {
  beforeEach(() => {
    mockedImportOperationsFile.mockReset();
  });

  afterEach(() => cleanup());

  it("starts idle with an accessible file picker and no accepted dataset", () => {
    render(<OperationsWorkspace />);
    expect(screen.getByLabelText("Archivo Excel (.xlsx)")).toBeTruthy();
    expect(screen.getByText(/Selecciona un archivo \.xlsx/)).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Conjunto actualmente aceptado" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Indicadores principales" })).toBeNull();
    expect(screen.queryByLabelText("Zona")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("loads a complete workbook and accepts it as the current dataset", async () => {
    mockedImportOperationsFile.mockResolvedValue(completeResult("new", 2));
    const user = userEvent.setup();
    render(<OperationsWorkspace />);

    await user.upload(screen.getByLabelText("Archivo Excel (.xlsx)"), excelFile("operations.xlsx"));

    expect(await screen.findByRole("heading", { name: "Importación completa" })).toBeTruthy();
    expect(screen.getByText("operations.xlsx")).toBeTruthy();
    expect(screen.getByText("Conjunto actualmente aceptado")).toBeTruthy();
    expect(screen.getByText("2 operaciones disponibles para el siguiente paso.")).toBeTruthy();
    expect(screen.getByText("2", { selector: "p" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ingresos" }).parentElement?.textContent).toContain("2.000");
    expect(screen.getByRole("heading", { name: "Margen calculado" }).parentElement?.textContent).toContain("400");
    expect(screen.getByText(new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 2 }).format(1))).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Indicadores principales" })).toBeTruthy();
    expect(screen.getByRole("table", { name: "Operaciones del conjunto filtrado" })).toBeTruthy();
  });

  it("shows partial row counts, issues, and warnings; replaces only after explicit acceptance", async () => {
    mockedImportOperationsFile
      .mockResolvedValueOnce(completeResult("accepted"))
      .mockResolvedValueOnce(partialResult());
    const user = userEvent.setup();
    render(<OperationsWorkspace />);

    const input = screen.getByLabelText("Archivo Excel (.xlsx)");
    await user.upload(input, excelFile("accepted.xlsx"));
    expect(await screen.findByText("accepted.xlsx")).toBeTruthy();

    await user.upload(input, excelFile("partial.xlsx"));

    expect(await screen.findByRole("heading", { name: /Importación parcial: requiere revisión/ })).toBeTruthy();
    expect(screen.getByText("Filas detectadas").parentElement?.textContent).toContain("2");
    expect(screen.getByText("Válidas").parentElement?.textContent).toContain("1");
    expect(screen.getByText("Inválidas").parentElement?.textContent).toContain("1");
    expect(screen.getByRole("heading", { name: "Errores detectados (1)" }).textContent).toContain("Errores detectados (1)");
    expect(
      screen.getByText((_, element) =>
        element?.tagName === "LI" &&
        element.textContent?.includes("Fila 3 · Fecha: La fecha no existe.") === true,
      ),
    ).toBeTruthy();
    expect(screen.getByText("accepted.xlsx")).toBeTruthy();

    const acceptButton = screen.getByRole("button", { name: "Aceptar 1 registro válido" });
    acceptButton.focus();
    expect(document.activeElement).toBe(acceptButton);
    await user.keyboard("{Enter}");

    expect(screen.getByRole("heading", { name: "Importación parcial aceptada" })).toBeTruthy();
    expect(screen.getByText("Conjunto actualmente aceptado")).toBeTruthy();
    expect(screen.getByText("partial.xlsx")).toBeTruthy();
    expect(screen.queryByText("accepted.xlsx")).toBeNull();
    expect(screen.getByText("Advertencias del conjunto aceptado (1)")).toBeTruthy();
    expect(screen.getByText(/representa 1 registro válido de 2/)).toBeTruthy();
    await user.click(screen.getByText("Advertencias del conjunto aceptado (1)"));
    expect(screen.getByText(/Valor informado: 100; calculado: 200/)).toBeTruthy();
  }, 10_000);

  it("preserves an accepted dataset when a replacement import fails", async () => {
    mockedImportOperationsFile
      .mockResolvedValueOnce(completeResult("old"))
      .mockResolvedValueOnce(failedResult("Falta la hoja Datos."));
    const user = userEvent.setup();
    render(<OperationsWorkspace />);
    const input = screen.getByLabelText("Archivo Excel (.xlsx)");

    await user.upload(input, excelFile("accepted.xlsx"));
    expect(await screen.findByText("accepted.xlsx")).toBeTruthy();

    await user.upload(input, excelFile("broken.xlsx"));

    expect(await screen.findByRole("heading", { name: "No se pudo completar la importación" })).toBeTruthy();
    expect(screen.getByText("Falta la hoja Datos.")).toBeTruthy();
    expect(screen.getByText(/este conjunto anterior se mantiene sin cambios/)).toBeTruthy();
    expect(screen.getByText("accepted.xlsx")).toBeTruthy();
  });

  it("retains accepted partial issues and warnings when a later replacement fails", async () => {
    mockedImportOperationsFile
      .mockResolvedValueOnce(partialResult())
      .mockResolvedValueOnce(failedResult("No se pudo abrir el nuevo archivo."));
    const user = userEvent.setup();
    render(<OperationsWorkspace />);
    const input = screen.getByLabelText("Archivo Excel (.xlsx)");

    await user.upload(input, excelFile("partial-accepted.xlsx"));
    await user.click(await screen.findByRole("button", { name: "Aceptar 1 registro válido" }));
    expect(screen.getByText(/representa 1 registro válido de 2/)).toBeTruthy();

    await user.upload(input, excelFile("failed-replacement.xlsx"));
    expect(await screen.findByText("No se pudo abrir el nuevo archivo.")).toBeTruthy();
    expect(screen.getByText("partial-accepted.xlsx")).toBeTruthy();
    expect(screen.getByText(/Errores del conjunto aceptado \(1\)/)).toBeTruthy();
    expect(screen.getByText(/Advertencias del conjunto aceptado \(1\)/)).toBeTruthy();
    expect(screen.getByRole("row", { name: /valid-1/ })).toBeTruthy();
  });

  it("replaces an accepted dataset only after a complete replacement succeeds", async () => {
    mockedImportOperationsFile
      .mockResolvedValueOnce(completeResult("old"))
      .mockResolvedValueOnce(completeResult("new", 3));
    const user = userEvent.setup();
    render(<OperationsWorkspace />);
    const input = screen.getByLabelText("Archivo Excel (.xlsx)");

    await user.upload(input, excelFile("old.xlsx"));
    expect(await screen.findByText("old.xlsx")).toBeTruthy();
    await user.upload(input, excelFile("new.xlsx"));

    expect(await screen.findByText("new.xlsx")).toBeTruthy();
    expect(screen.queryByText("old.xlsx")).toBeNull();
    expect(screen.getByText("3 operaciones disponibles para el siguiente paso.")).toBeTruthy();
  });

  it("ignores stale results when two imports resolve out of order", async () => {
    const resolvers = new Map<string, (result: ImportOperationsResult) => void>();
    mockedImportOperationsFile.mockImplementation(
      (file) =>
        new Promise((resolve) => {
          resolvers.set(file.name, resolve);
        }),
    );
    const user = userEvent.setup();
    render(<OperationsWorkspace />);
    const input = screen.getByLabelText("Archivo Excel (.xlsx)");

    await user.upload(input, excelFile("older.xlsx"));
    await user.upload(input, excelFile("newer.xlsx"));
    expect(screen.getByRole("status").textContent).toContain("Procesando newer.xlsx");

    await waitFor(() => expect(mockedImportOperationsFile).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(resolvers.has("newer.xlsx")).toBe(true));
    await act(async () => {
      resolvers.get("newer.xlsx")?.(completeResult("newer"));
    });
    expect(await screen.findByText("newer.xlsx")).toBeTruthy();

    await act(async () => {
      resolvers.get("older.xlsx")?.(completeResult("older", 4));
    });
    await waitFor(() => expect(screen.getByText("newer.xlsx")).toBeTruthy());
    expect(screen.queryByText("older.xlsx")).toBeNull();
    expect(screen.getByText("1 operación disponible para el siguiente paso.")).toBeTruthy();
  });

  it("allows selecting the same file again", async () => {
    mockedImportOperationsFile.mockResolvedValue(completeResult("same"));
    const user = userEvent.setup();
    render(<OperationsWorkspace />);
    const input = screen.getByLabelText("Archivo Excel (.xlsx)");
    const sameFile = excelFile("repeat.xlsx");

    await user.upload(input, sameFile);
    await waitFor(() => expect(mockedImportOperationsFile).toHaveBeenCalledTimes(1));
    await user.upload(input, sameFile);
    await waitFor(() => expect(mockedImportOperationsFile).toHaveBeenCalledTimes(2));
  });

  it("filters the shared data set and resets the result without losing the accepted file", async () => {
    const operations: Operation[] = [
      { ...operation("bogota-complete"), revenue: { amount: "1000", currency: "COP" } },
      { ...operation("antioquia-incident"), zone: "Antioquia", serviceType: "Express", status: "incident", slaCompliant: false, revenue: { amount: "2000", currency: "COP" } },
      { ...operation("bogota-cancelled"), status: "cancelled", revenue: { amount: "3000", currency: "COP" } },
    ];
    mockedImportOperationsFile.mockResolvedValue({
      ...completeResult("filtered", 3),
      operations,
    });
    const user = userEvent.setup();
    render(<OperationsWorkspace />);
    await user.upload(screen.getByLabelText("Archivo Excel (.xlsx)"), excelFile("filtered.xlsx"));
    await screen.findByText("filtered.xlsx");

    const zone = screen.getByLabelText("Zona");
    await user.selectOptions(zone, "Bogotá");
    expect(screen.getByText((_, element) => element?.textContent === "2 de 3 operaciones")).toBeTruthy();
    expect(screen.getByRole("row", { name: /bogota-complete/ })).toBeTruthy();
    expect(screen.getByRole("row", { name: /bogota-cancelled/ })).toBeTruthy();
    expect(screen.queryByRole("row", { name: /antioquia-incident/ })).toBeNull();
    expect(screen.getByText("Bogotá: 2 operaciones")).toBeTruthy();

    await user.selectOptions(screen.getByLabelText("Tipo de servicio"), "Carga");
    await user.selectOptions(screen.getByLabelText("Estado"), "cancelled");
    expect(screen.getByText((_, element) => element?.textContent === "1 de 3 operaciones")).toBeTruthy();
    expect(screen.getByRole("row", { name: /bogota-cancelled/ })).toBeTruthy();
    expect(screen.queryByRole("row", { name: /bogota-complete/ })).toBeNull();
    expect(screen.getByText("Bogotá: 1 operación")).toBeTruthy();

    await user.selectOptions(screen.getByLabelText("Estado"), "incident");
    expect(screen.getByText("No hay resultados para estos filtros")).toBeTruthy();
    expect(screen.getByText("No calculable")).toBeTruthy();
    expect(screen.getByRole("table", { name: "Operaciones del conjunto filtrado" })).toBeTruthy();
    expect(screen.getByText("No hay operaciones que coincidan con los filtros.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Restablecer filtros" }));
    expect(screen.getByText((_, element) => element?.textContent === "3 de 3 operaciones")).toBeTruthy();
    expect(screen.getByRole("row", { name: /antioquia-incident/ })).toBeTruthy();
    expect(screen.getByText("filtered.xlsx")).toBeTruthy();
  });

  it("paginates locally and keeps monetary values grouped by their currency", async () => {
    const mixedCurrencyOperations = [
      { ...operation("page-1"), revenue: { amount: "12345678901234567890.12", currency: "COP" }, cost: { amount: "10", currency: "COP" } },
      ...Array.from({ length: 10 }, (_, index) => operation(`page-${index + 2}`)),
      { ...operation("usd"), zone: "Antioquia", revenue: { amount: "12.50", currency: "USD" }, cost: { amount: "2", currency: "USD" } },
    ];
    mockedImportOperationsFile.mockResolvedValue({
      ...completeResult("mixed", 1),
      totalRows: mixedCurrencyOperations.length,
      operations: mixedCurrencyOperations,
    });
    const user = userEvent.setup();
    render(<OperationsWorkspace />);
    await user.upload(screen.getByLabelText("Archivo Excel (.xlsx)"), excelFile("mixed.xlsx"));
    await screen.findByText("mixed.xlsx");

    expect(screen.getAllByRole("row")).toHaveLength(11);
    expect(screen.getByText("1 / 2")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(screen.getByText("2 / 2")).toBeTruthy();
    expect(screen.getByText("page-11")).toBeTruthy();
    expect(screen.getByText("usd")).toBeTruthy();
    const revenueValues = screen.getByRole("heading", { name: "Ingresos" }).parentElement?.querySelector("ul");
    expect(revenueValues?.children).toHaveLength(2);
    expect(revenueValues?.textContent).toContain("12.345.678.901.234.577.890,12");
    expect(revenueValues?.textContent).toContain("12,5");

    await user.selectOptions(screen.getByLabelText("Zona"), "Antioquia");
    expect(screen.getByText((_, element) => element?.textContent === "1 de 12 operaciones")).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Página siguiente" })).toBeNull();
  });
});
