import type { AcceptedDataset } from "@/features/importOperations/hooks/UseOperationImport";

interface AcceptedDatasetSummaryProps {
  readonly dataset: AcceptedDataset | null;
  readonly isProcessingReplacement: boolean;
  readonly replacementFailed: boolean;
}

export function AcceptedDatasetSummary({
  dataset,
  isProcessingReplacement,
  replacementFailed,
}: AcceptedDatasetSummaryProps) {
  if (!dataset) return null;
  const operationLabel =
    dataset.operations.length === 1 ? "operación" : "operaciones";
  const availabilityLabel =
    dataset.operations.length === 1 ? "disponible" : "disponibles";

  return (
    <section
      aria-labelledby="accepted-dataset-heading"
      className="my-6 rounded-xl border border-accent/30 bg-accent/5 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold" id="accepted-dataset-heading">
            Conjunto actualmente aceptado
          </h2>
          <p className="mt-1 break-all text-sm text-muted">
            {dataset.sourceFileName}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            dataset.completeness === "partial"
              ? "bg-amber-950/70 text-amber-200"
              : "bg-accent/10 text-accent"
          }`}
        >
          {dataset.completeness === "partial" ? "Parcial aceptado" : "Completo"}
        </span>
      </div>
      <p className="mt-3 text-sm text-foreground">
        {dataset.operations.length} {operationLabel} {availabilityLabel} para
        analizar
        {dataset.completeness === "partial"
          ? `; ${dataset.rejectedRows} filas rechazadas de ${dataset.totalRows}.`
          : "."}
      </p>
      {dataset.completeness === "partial" && (
        <div className="mt-4 space-y-3 rounded-lg border border-amber-800 bg-amber-950/30 p-4 text-sm text-amber-100">
          <p className="font-semibold">
            Este dashboard representa {dataset.operations.length}{" "}
            {dataset.operations.length === 1
              ? "registro válido"
              : "registros válidos"}{" "}
            de {dataset.totalRows}; {dataset.rejectedRows} rechazados.
          </p>
          {dataset.errors.length > 0 && (
            <details>
              <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-accent">
                Errores del conjunto aceptado ({dataset.errors.length})
              </summary>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                {dataset.errors.map((issue, index) => (
                  <li key={`${issue.row}-${issue.field}-${index}`}>
                    {issue.row === null ? "Archivo" : `Fila ${issue.row}`}
                    {issue.field ? ` · ${issue.field}` : ""}: {issue.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {dataset.warnings.length > 0 && (
            <details>
              <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-accent">
                Advertencias del conjunto aceptado ({dataset.warnings.length})
              </summary>
              <ul className="mt-2 space-y-1">
                {dataset.warnings.map((warning) => (
                  <li key={`${warning.row}-${warning.field}`}>
                    Fila {warning.row} · {warning.field}: {warning.message}{" "}
                    Valor informado: {warning.declaredValue}; calculado:{" "}
                    {warning.calculatedValue}.
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      {isProcessingReplacement && (
        <p className="mt-2 text-sm text-muted">
          Se conserva este conjunto mientras se procesa el nuevo archivo.
        </p>
      )}
      {replacementFailed && (
        <p className="mt-2 text-sm font-medium text-amber-200">
          El nuevo archivo falló; este conjunto anterior se mantiene sin
          cambios.
        </p>
      )}
    </section>
  );
}
