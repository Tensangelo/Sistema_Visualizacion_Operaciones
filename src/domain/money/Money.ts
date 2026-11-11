/** Exact decimal amount represented as a base-10 string. */
export type DecimalAmount = string;

/** ISO 4217 currency code, validated at the system boundary. */
export type CurrencyCode = string;

export interface Money {
  readonly amount: DecimalAmount;
  readonly currency: CurrencyCode;
}
