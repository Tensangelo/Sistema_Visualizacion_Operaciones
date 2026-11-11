import { useCallback, useMemo, useState } from "react";
import type { Operation, OperationStatus } from "@/domain/operations/Operation";
import {
  calculateSlaComplianceRate,
  calculateTotalCost,
  calculateTotalMargin,
  calculateTotalRevenue,
  countOperations,
  filterOperations,
  groupOperationsByZone,
  type OperationFilters,
} from "@/domain/operations/Metrics";

export interface DashboardData {
  readonly filters: OperationFilters;
  readonly setFilters: (filters: OperationFilters) => void;
  readonly resetFilters: () => void;
  readonly zones: readonly string[];
  readonly serviceTypes: readonly string[];
  readonly filteredOperations: readonly Operation[];
  readonly totalOperations: number;
  readonly revenue: ReturnType<typeof calculateTotalRevenue>;
  readonly costs: ReturnType<typeof calculateTotalCost>;
  readonly margin: ReturnType<typeof calculateTotalMargin>;
  readonly sla: ReturnType<typeof calculateSlaComplianceRate>;
  readonly operationsByZone: ReturnType<typeof groupOperationsByZone>;
}

const emptyFilters: OperationFilters = {};

export function useDashboardData(operations: readonly Operation[]): DashboardData {
  const [filters, setFiltersState] = useState<OperationFilters>(emptyFilters);

  const setFilters = useCallback((nextFilters: OperationFilters) => {
    setFiltersState(nextFilters);
  }, []);
  const resetFilters = useCallback(() => setFilters(emptyFilters), [setFilters]);

  return useMemo(() => {
    const filteredOperations = filterOperations(operations, filters);
    const zones = [...new Set(operations.map(({ zone }) => zone))].sort((a, b) =>
      a.localeCompare(b, "es"),
    );
    const serviceTypes = [...new Set(operations.map(({ serviceType }) => serviceType))].sort(
      (a, b) => a.localeCompare(b, "es"),
    );

    return {
      filters,
      setFilters,
      resetFilters,
      zones,
      serviceTypes,
      filteredOperations,
      totalOperations: countOperations(filteredOperations),
      revenue: calculateTotalRevenue(filteredOperations),
      costs: calculateTotalCost(filteredOperations),
      margin: calculateTotalMargin(filteredOperations),
      sla: calculateSlaComplianceRate(filteredOperations),
      operationsByZone: groupOperationsByZone(filteredOperations),
    };
  }, [filters, operations, resetFilters, setFilters]);
}

export function statusLabel(status: OperationStatus): string {
  switch (status) {
    case "completed":
      return "Completada";
    case "incident":
      return "Con novedad";
    case "cancelled":
      return "Cancelada";
  }
}
