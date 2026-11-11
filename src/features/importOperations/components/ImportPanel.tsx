"use client";

import type { ChangeEvent } from "react";
import { ImportFeedback } from "@/features/importOperations/components/ImportFeedback";
import type { ImportProcessState } from "@/features/importOperations/hooks/UseOperationImport";

interface ImportPanelProps {
  readonly process: ImportProcessState;
  readonly onImportFile: (file: File) => void;
  readonly onAcceptPartial: () => void;
}

export function ImportPanel({
  process,
  onImportFile,
  onAcceptPartial,
}: ImportPanelProps) {
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    // Resetting the input allows selecting the same file again after any result.
    event.currentTarget.value = "";
    if (file) onImportFile(file);
  }

  const statusMessage =
    process.status === "loading"
      ? `Procesando ${process.fileName}. No cierres esta página.`
      : null;

  return (
    <section
      aria-labelledby="operations-import-heading"
      className="rounded-2xl border border-outline bg-surface p-5 shadow-lg sm:p-7 lg:p-8"
    >
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent sm:text-sm">
          Importación local
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl" id="operations-import-heading">
          Cargar archivo de operaciones
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
          Selecciona un archivo .xlsx. Se procesa en este dispositivo y no se envía a ningún servidor.
          Los archivos deben contener la hoja Datos.
        </p>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium" htmlFor="operations-file">
          Archivo Excel (.xlsx)
        </label>
        <input
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          aria-describedby="operations-file-help"
          className="mt-2 block min-h-12 w-full max-w-2xl cursor-pointer rounded-lg border border-outline bg-background text-sm text-foreground file:mr-4 file:min-h-12 file:border-0 file:bg-accent file:px-4 file:font-semibold file:text-background hover:file:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          id="operations-file"
          onChange={handleFileChange}
          type="file"
        />
        <p className="mt-2 text-sm text-muted" id="operations-file-help">
          Máximo 10 MiB. Puedes seleccionar el mismo archivo nuevamente para reintentar.
        </p>
      </div>

      {statusMessage && (
        <p
          aria-busy="true"
          className="mt-5 flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm font-medium text-foreground"
          role="status"
        >
          <span
            aria-hidden="true"
            className="size-4 shrink-0 animate-spin rounded-full border-2 border-accent border-r-transparent"
          />
          {statusMessage}
        </p>
      )}

      <ImportFeedback
        process={process}
        onAcceptPartial={onAcceptPartial}
        showIssues={process.status !== "partial" || !process.accepted}
      />
    </section>
  );
}
