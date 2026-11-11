import type { Operation } from "@/domain/operations/Operation";

export interface ImportIssue {
  readonly row: number | null;
  readonly field: string | null;
  readonly message: string;
}

export interface ImportWarning {
  readonly row: number;
  readonly field: string;
  readonly message: string;
  readonly declaredValue: string;
  readonly calculatedValue: string;
}

export interface ImportOperationsResult {
  readonly status: "complete" | "partial" | "failed";
  readonly totalRows: number;
  /** Valid, unique rows; row-level failures are always reported in `errors`. */
  readonly operations: Operation[];
  readonly errors: ImportIssue[];
  readonly warnings: ImportWarning[];
  readonly rejectedRows: number;
}
