import { describe, expect, it } from "vitest";
import type { Money } from "@/domain/money/Money";
import type { Operation } from "@/domain/operations/Operation";
import {
  calculateMarginPercentages,
  calculateSlaComplianceRate,
  calculateTotalCost,
  calculateTotalMargin,
  calculateTotalRevenue,
  countOperations,
  filterOperations,
  groupOperationsByServiceType,
  groupOperationsByStatus,
  groupOperationsByZone,
} from "@/domain/operations/Metrics";

function money(amount: string, currency = "COP"): Money {
  return { amount, currency };
}

function operation(
  overrides: Partial<Omit<Operation, "id">> & { readonly id: string },
): Operation {
  return {
    date: "2026-02-01",
    zone: "Bogotá",
    route: "A-B",
    serviceType: "Carga",
    anonymizedCustomer: "Cliente 1",
    vehicleCode: "V-1",
    kilometers: 10,
    plannedHours: 2,
    actualHours: 2,
    status: "completed",
    slaCompliant: true,
    revenue: money("100"),
    cost: money("60"),
    reportedMargin: money("40"),
    serviceRating: 5,
    ...overrides,
  };
}

describe("operation metrics", () => {
  it("returns empty totals and null rates for empty collections", () => {
    expect(countOperations([])).toBe(0);
    expect(calculateTotalRevenue([])).toEqual([]);
    expect(calculateTotalCost([])).toEqual([]);
    expect(calculateTotalMargin([])).toEqual([]);
    expect(calculateMarginPercentages([])).toEqual([]);
    expect(calculateSlaComplianceRate([])).toEqual({
      numerator: 0,
      denominator: 0,
      percentage: null,
    });
  });

  it("calculates exact decimal totals and a single operation margin", () => {
    const operations = [
      operation({ id: "one", revenue: money("12.35"), cost: money("2.10") }),
    ];
    expect(countOperations(operations)).toBe(1);
    expect(calculateTotalRevenue(operations)).toEqual([money("12.35")]);
    expect(calculateTotalCost(operations)).toEqual([money("2.1")]);
    expect(calculateTotalMargin(operations)).toEqual([money("10.25")]);
    expect(calculateMarginPercentages(operations)[0]?.percentage).toBeCloseTo(
      82.99595,
      4,
    );
  });

  it("supports multiple operations and preserves negative margins", () => {
    const operations = [
      operation({ id: "one", revenue: money("10.10"), cost: money("20.20") }),
      operation({ id: "two", revenue: money("0.20"), cost: money("0.10") }),
    ];
    expect(countOperations(operations)).toBe(2);
    expect(calculateTotalRevenue(operations)).toEqual([money("10.3")]);
    expect(calculateTotalCost(operations)).toEqual([money("20.3")]);
    expect(calculateTotalMargin(operations)).toEqual([money("-10")]);
  });

  it("returns null margin percentage when revenue is zero", () => {
    const operations = [operation({ id: "zero", revenue: money("0"), cost: money("2") })];
    expect(calculateMarginPercentages(operations)).toEqual([
      { currency: "COP", percentage: null },
    ]);
  });

  it("includes cancelled operations in financial and SLA denominators", () => {
    const operations = [
      operation({ id: "done", status: "completed", slaCompliant: true }),
      operation({ id: "cancelled", status: "cancelled", slaCompliant: false }),
    ];
    expect(countOperations(operations)).toBe(2);
    expect(calculateTotalRevenue(operations)).toEqual([money("200")]);
    expect(calculateSlaComplianceRate(operations)).toEqual({
      numerator: 1,
      denominator: 2,
      percentage: 50,
    });
  });

  it("groups by zone, status, and service type", () => {
    const operations = [
      operation({ id: "1", zone: "Bogotá", serviceType: "Carga" }),
      operation({ id: "2", zone: "Bogotá", serviceType: "Carga" }),
      operation({
        id: "3",
        zone: "Antioquia",
        serviceType: "Paquete",
        status: "incident",
      }),
    ];
    expect(groupOperationsByZone(operations)).toEqual([
      { key: "Bogotá", count: 2 },
      { key: "Antioquia", count: 1 },
    ]);
    expect(groupOperationsByStatus(operations)).toEqual([
      { key: "completed", count: 2 },
      { key: "incident", count: 1 },
    ]);
    expect(groupOperationsByServiceType(operations)).toEqual([
      { key: "Carga", count: 2 },
      { key: "Paquete", count: 1 },
    ]);
  });

  it("combines filters with AND semantics without mutating the source", () => {
    const operations = [
      operation({ id: "1", zone: "Bogotá", status: "completed" }),
      operation({ id: "2", zone: "Bogotá", status: "incident" }),
      operation({ id: "3", zone: "Antioquia", status: "completed" }),
    ];
    const before = structuredClone(operations);

    expect(
      filterOperations(operations, {
        zone: "Bogotá",
        status: "completed",
        serviceType: "Carga",
      }).map(({ id }) => id),
    ).toEqual(["1"]);
    expect(filterOperations(operations, {}).map(({ id }) => id)).toEqual([
      "1",
      "2",
      "3",
    ]);
    expect(operations).toEqual(before);
  });

  it("keeps currency totals separate and rejects cross-currency arithmetic", () => {
    const operations = [
      operation({ id: "cop", revenue: money("100.25"), cost: money("1") }),
      operation({
        id: "usd",
        revenue: money("2.50", "USD"),
        cost: money("1", "USD"),
        reportedMargin: money("1.50", "USD"),
      }),
    ];
    expect(calculateTotalRevenue(operations)).toEqual([
      money("100.25"),
      money("2.5", "USD"),
    ]);
    expect(calculateTotalMargin(operations)).toEqual([
      money("99.25"),
      money("1.5", "USD"),
    ]);
    expect(() =>
      calculateTotalMargin([
        operation({ id: "invalid", revenue: money("10", "USD"), cost: money("1") }),
      ]),
    ).toThrow(/without conversion/);
  });

  it("does not mutate input records or their money values", () => {
    const operations = [operation({ id: "immutable", revenue: money("0.10") })];
    const originalRevenue = operations[0]?.revenue;
    const snapshot = structuredClone(operations);
    calculateTotalRevenue(operations);
    calculateTotalCost(operations);
    calculateTotalMargin(operations);
    expect(operations).toEqual(snapshot);
    expect(operations[0]?.revenue).toBe(originalRevenue);
  });
});
