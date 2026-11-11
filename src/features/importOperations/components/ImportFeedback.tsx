import type { ImportProcessState } from "@/features/importOperations/hooks/UseOperationImport";

interface ImportFeedbackProps {
  readonly process: ImportProcessState;
  readonly onAcceptPartial: () => void;
  readonly showIssues: boolean;
}

function ImportCounts({
  total,
  valid,
  invalid,
}: {
  readonly total: number;
  readonly valid: number;
  readonly invalid: number;
}) {
  const counts = [
    { label: "Filas detectadas", value: total },
    { label: "Válidas", value: valid },
    { label: "Inválidas", value: invalid },
  ];

  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {counts.map(({ label, value }) => (
        <div
          className="rounded-xl border border-outline bg-background/60 px-4 py-3"
          key={label}
        >
          <dt className="text-sm text-muted">{label}</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ImportFeedback({ process, onAcceptPartial, showIssues }: ImportFeedbackProps) {
  if (process.status === "idle" || process.status === "loading") return null;

  const { result } = process;
  const isPartial = process.status === "partial";
  const isFailed = process.status === "failed";
  const validRowsLabel = result.operations.length === 1 ? "registro válido" : "registros válidos";
  const heading = isFailed
    ? "No se pudo completar la importación"
    : isPartial
      ? process.accepted
        ? "Importación parcial aceptada"
        : "Importación parcial: requiere revisión"
      : "Importación completa";

  return (
    <section
      aria-labelledby="import-result-heading"
      className="mt-6 space-y-5 border-t border-outline pt-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 aria-live="polite" className="text-lg font-semibold" id="import-result-heading">
            {heading}
          </h3>
          {(isFailed || (isPartial && !process.accepted)) && (
            <p className="mt-1 break-all text-sm text-muted">Archivo: {process.fileName}</p>
          )}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            isFailed
              ? "bg-red-950/70 text-red-200"
              : isPartial
                ? "bg-amber-950/70 text-amber-200"
                : "bg-accent/10 text-accent"
          }`}
        >
          {isFailed ? "Fallida" : isPartial ? "Parcial" : "Completa"}
        </span>
      </div>

      {!isFailed && (
        <ImportCounts
          total={result.totalRows}
          valid={result.operations.length}
          invalid={result.rejectedRows}
        />
      )}

      {isPartial && !process.accepted && (
        <div className="rounded-xl border border-amber-800 bg-amber-950/40 p-4">
          <p className="text-sm text-amber-100">
            Los registros válidos no reemplazan el conjunto aceptado hasta que confirmes su uso. Las filas con errores quedan excluidas y detalladas abajo.
          </p>
          <button
            className="mt-4 min-h-11 rounded-lg bg-accent px-4 py-2 font-semibold text-background hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            disabled={result.operations.length === 0}
            onClick={onAcceptPartial}
            type="button"
          >
            Aceptar {result.operations.length} {validRowsLabel}
          </button>
          {result.operations.length === 0 && (
            <p className="mt-2 text-sm text-amber-100">
              No hay registros válidos para aceptar.
            </p>
          )}
        </div>
      )}

      {isPartial && process.accepted && (
        <p className="rounded-xl border border-amber-800 bg-amber-950/40 p-4 text-sm text-amber-100">
          Aceptaste explícitamente este conjunto parcial. Contiene únicamente las filas válidas; revisa los errores antes de usarlo.
        </p>
      )}

      {showIssues && result.errors.length > 0 && (
        <div className="space-y-2">
          <h4 aria-live="assertive" className="font-medium">Errores detectados ({result.errors.length})</h4>
          <ul className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-100">
            {result.errors.map((issue, index) => (
              <li className="leading-relaxed" key={`${issue.row}-${issue.field}-${index}`}>
                <span className="font-semibold">
                  {issue.row === null ? "Archivo" : `Fila ${issue.row}`}
                  {issue.field ? ` · ${issue.field}` : ""}:
                </span>{" "}
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showIssues && result.warnings.length > 0 && (
        <details className="rounded-xl border border-outline p-4">
          <summary className="cursor-pointer font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            Advertencias ({result.warnings.length})
          </summary>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {result.warnings.map((warning) => (
              <li className="break-words" key={`${warning.row}-${warning.field}`}>
                Fila {warning.row} · {warning.field}: {warning.message} Valor informado: {warning.declaredValue}; calculado: {warning.calculatedValue}.
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
