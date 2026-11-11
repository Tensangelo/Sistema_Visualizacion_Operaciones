import { useCallback, useEffect, useRef, useState } from "react";
import type { Operation } from "@/domain/operations/Operation";
import { importOperationsFile } from "@/infrastructure/excel/ImportOperations";
import type { ImportOperationsResult } from "@/infrastructure/excel/ImportResult";
import type { ImportIssue, ImportWarning } from "@/infrastructure/excel/ImportResult";

export interface AcceptedDataset {
  readonly revision: number;
  readonly sourceFileName: string;
  readonly operations: readonly Operation[];
  readonly completeness: "complete" | "partial";
  readonly totalRows: number;
  readonly rejectedRows: number;
  readonly errors: readonly ImportIssue[];
  readonly warnings: readonly ImportWarning[];
}

export type ImportProcessState =
  | { readonly status: "idle" }
  | { readonly status: "loading"; readonly fileName: string }
  | {
      readonly status: "complete";
      readonly fileName: string;
      readonly result: ImportOperationsResult;
    }
  | {
      readonly status: "partial";
      readonly fileName: string;
      readonly result: ImportOperationsResult;
      readonly accepted: boolean;
    }
  | {
      readonly status: "failed";
      readonly fileName: string;
      readonly result: ImportOperationsResult;
    };

export interface OperationImportState {
  readonly process: ImportProcessState;
  readonly acceptedDataset: AcceptedDataset | null;
}

const initialState: OperationImportState = {
  process: { status: "idle" },
  acceptedDataset: null,
};

function toAcceptedDataset(
  fileName: string,
  result: ImportOperationsResult,
  revision: number,
): AcceptedDataset {
  return {
    revision,
    sourceFileName: fileName,
    operations: result.operations,
    completeness: result.status === "complete" ? "complete" : "partial",
    totalRows: result.totalRows,
    rejectedRows: result.rejectedRows,
    errors: result.errors,
    warnings: result.warnings,
  };
}

function unexpectedFailure(): ImportOperationsResult {
  return {
    status: "failed",
    totalRows: 0,
    operations: [],
    errors: [
      {
        row: null,
        field: null,
        message: "Ocurrió un error inesperado al procesar el archivo.",
      },
    ],
    warnings: [],
    rejectedRows: 0,
  };
}

export function useOperationImport() {
  const [state, setState] = useState<OperationImportState>(initialState);
  const requestSequence = useRef(0);
  const datasetRevision = useRef(0);

  useEffect(
    () => () => {
      requestSequence.current += 1;
    },
    [],
  );

  const importFile = useCallback(async (file: File) => {
    const requestId = ++requestSequence.current;
    setState((previous) => ({
      ...previous,
      process: { status: "loading", fileName: file.name },
    }));

    let result: ImportOperationsResult;
    try {
      result = await importOperationsFile(file);
    } catch {
      result = unexpectedFailure();
    }
    if (requestId !== requestSequence.current) return;

    setState((previous) => {
      if (result.status === "complete") {
        return {
          process: { status: "complete", fileName: file.name, result },
          acceptedDataset: toAcceptedDataset(file.name, result, ++datasetRevision.current),
        };
      }
      if (result.status === "partial") {
        return {
          ...previous,
          process: {
            status: "partial",
            fileName: file.name,
            result,
            accepted: false,
          },
        };
      }
      return {
        ...previous,
        process: { status: "failed", fileName: file.name, result },
      };
    });
  }, []);

  const acceptPartialImport = useCallback(() => {
    setState((previous) => {
      if (
        previous.process.status !== "partial" ||
        previous.process.accepted ||
        previous.process.result.operations.length === 0
      ) {
        return previous;
      }
      return {
        process: { ...previous.process, accepted: true },
        acceptedDataset: toAcceptedDataset(
          previous.process.fileName,
          previous.process.result,
          ++datasetRevision.current,
        ),
      };
    });
  }, []);

  return { state, importFile, acceptPartialImport };
}
