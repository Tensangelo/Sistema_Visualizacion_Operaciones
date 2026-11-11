import type { Money } from "@/domain/money/Money";

/** Calendar date in YYYY-MM-DD form, without timezone semantics. */
export type PlainDate = `${number}-${number}-${number}`;

export type OperationStatus = "completed" | "incident" | "cancelled";

export interface Operation {
  readonly id: string;
  readonly date: PlainDate;
  readonly zone: string;
  readonly route: string;
  readonly serviceType: string;
  readonly anonymizedCustomer: string;
  readonly vehicleCode: string;
  readonly kilometers: number;
  readonly plannedHours: number;
  readonly actualHours: number;
  readonly status: OperationStatus;
  readonly slaCompliant: boolean;
  readonly revenue: Money;
  readonly cost: Money;
  readonly reportedMargin: Money;
  readonly serviceRating: number;
}
