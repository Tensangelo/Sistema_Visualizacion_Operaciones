import { subtractMoney, sumMoney } from "@/domain/money/Decimal";
import type { CurrencyCode, Money } from "@/domain/money/Money";
import type { Operation, OperationStatus } from "@/domain/operations/Operation";

export interface Rate {
  readonly numerator: number;
  readonly denominator: number;
  /** Percentage from 0 to 100, or null when the denominator is zero. */
  readonly percentage: number | null;
}

export interface CurrencyRate {
  readonly currency: CurrencyCode;
  readonly percentage: number | null;
}

export interface GroupCount<Key extends string> {
  readonly key: Key;
  readonly count: number;
}

export interface OperationFilters {
  readonly zone?: string;
  readonly status?: OperationStatus;
  readonly serviceType?: string;
}

export function countOperations(operations: readonly Operation[]): number {
  return operations.length;
}

export function calculateTotalRevenue(operations: readonly Operation[]): Money[] {
  return sumMoney(operations.map(({ revenue }) => revenue));
}

export function calculateTotalCost(operations: readonly Operation[]): Money[] {
  return sumMoney(operations.map(({ cost }) => cost));
}

export function calculateTotalMargin(operations: readonly Operation[]): Money[] {
  return sumMoney(
    operations.map(({ revenue, cost }) => subtractMoney(revenue, cost)),
  );
}

export function calculateMarginPercentages(
  operations: readonly Operation[],
): CurrencyRate[] {
  const revenues = new Map(
    calculateTotalRevenue(operations).map(({ currency, amount }) => [
      currency,
      Number(amount),
    ]),
  );

  return calculateTotalMargin(operations).map(({ currency, amount }) => {
    const revenue = revenues.get(currency) ?? 0;
    return {
      currency,
      percentage: revenue === 0 ? null : (Number(amount) / revenue) * 100,
    };
  });
}

export function calculateSlaComplianceRate(
  operations: readonly Operation[],
): Rate {
  const numerator = operations.reduce(
    (count, operation) => count + Number(operation.slaCompliant),
    0,
  );
  const denominator = operations.length;
  return {
    numerator,
    denominator,
    percentage: denominator === 0 ? null : (numerator / denominator) * 100,
  };
}

function groupOperations<Key extends string>(
  operations: readonly Operation[],
  keyOf: (operation: Operation) => Key,
): GroupCount<Key>[] {
  const counts = new Map<Key, number>();
  for (const operation of operations) {
    const key = keyOf(operation);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].map(([key, count]) => ({ key, count }));
}

export function groupOperationsByZone(
  operations: readonly Operation[],
): GroupCount<string>[] {
  return groupOperations(operations, ({ zone }) => zone);
}

export function groupOperationsByStatus(
  operations: readonly Operation[],
): GroupCount<OperationStatus>[] {
  return groupOperations(operations, ({ status }) => status);
}

export function groupOperationsByServiceType(
  operations: readonly Operation[],
): GroupCount<string>[] {
  return groupOperations(operations, ({ serviceType }) => serviceType);
}

export function filterOperations(
  operations: readonly Operation[],
  filters: OperationFilters,
): Operation[] {
  return operations.filter(
    (operation) =>
      (filters.zone === undefined || operation.zone === filters.zone) &&
      (filters.status === undefined || operation.status === filters.status) &&
      (filters.serviceType === undefined ||
        operation.serviceType === filters.serviceType),
  );
}
