"use client";

import dynamic from "next/dynamic";
import type { Operation } from "@/domain/operations/Operation";
import { ImportPanel } from "@/features/importOperations/components/ImportPanel";
import { AcceptedDatasetSummary } from "@/features/importOperations/components/AcceptedDatasetSummary";
import { useOperationImport } from "@/features/importOperations/hooks/UseOperationImport";
import { FiltersPanel } from "@/features/dashboard/components/FiltersPanel";
import { KpiGrid } from "@/features/dashboard/components/KpiGrid";
import { OperationsTable } from "@/features/dashboard/components/OperationsTable";
import { DashboardFooter } from "@/features/dashboard/components/DashboardFooter";
import { useDashboardData } from "@/features/dashboard/hooks/UseDashboardData";

const OperationsByZoneChart = dynamic(
  () =>
    import("@/features/dashboard/components/OperationsByZoneChart").then(
      (module) => module.OperationsByZoneChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        aria-label="Cargando gráfico"
        className="h-72 animate-pulse rounded-2xl border border-outline bg-surface"
        role="status"
      />
    ),
  },
);

function DashboardContent({
  operations,
}: {
  readonly operations: readonly Operation[];
}) {
  const dashboard = useDashboardData(operations);

  return (
    <div className="mt-8 space-y-6">
      <FiltersPanel
        filters={dashboard.filters}
        onChange={dashboard.setFilters}
        onReset={dashboard.resetFilters}
        resultCount={dashboard.totalOperations}
        serviceTypes={dashboard.serviceTypes}
        totalCount={operations.length}
        zones={dashboard.zones}
      />
      <KpiGrid
        costs={dashboard.costs}
        margin={dashboard.margin}
        revenue={dashboard.revenue}
        sla={dashboard.sla}
        totalOperations={dashboard.totalOperations}
      />
      {dashboard.totalOperations === 0 && (
        <section className="rounded-2xl border border-outline bg-surface px-6 py-12 text-center">
          <h2 className="text-lg font-semibold">
            No hay resultados para estos filtros
          </h2>
          <p className="mt-2 text-sm text-muted" role="status">
            Cambia o restablece los criterios para ver operaciones.
          </p>
          <button
            className="mt-4 min-h-11 rounded-lg bg-accent px-4 font-semibold text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={dashboard.resetFilters}
            type="button"
          >
            Restablecer filtros
          </button>
        </section>
      )}
      <OperationsByZoneChart data={dashboard.operationsByZone} />
      <OperationsTable
        key={`${dashboard.filters.zone ?? ""}|${dashboard.filters.serviceType ?? ""}|${dashboard.filters.status ?? ""}`}
        operations={dashboard.filteredOperations}
      />
    </div>
  );
}

export function OperationsWorkspace() {
  const { state, importFile, acceptPartialImport } = useOperationImport();
  const { acceptedDataset } = state;

  return (
    <main className="min-h-screen bg-background px-4 pt-6 text-foreground">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 border-b border-outline pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent sm:text-sm">
              Unatrans · Operaciones
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Dashboard operacional
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
              Analiza desempeño, cumplimiento y resultados a partir del archivo
              operativo importado localmente.
            </p>
          </div>
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-semibold text-background hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            href="#importacion"
          >
            {acceptedDataset ? "Cambiar archivo" : "Importar Excel"}
          </a>
        </header>

        {acceptedDataset ? (
          <AcceptedDatasetSummary
            dataset={acceptedDataset}
            isProcessingReplacement={state.process.status === "loading"}
            replacementFailed={state.process.status === "failed"}
          />
        ) : (
          <p className="mb-6 text-sm text-muted">
            Aún no hay un archivo aceptado.
          </p>
        )}

        <div id="importacion" tabIndex={-1}>
          <ImportPanel
            onAcceptPartial={acceptPartialImport}
            onImportFile={(file) => void importFile(file)}
            process={state.process}
          />
        </div>

        {acceptedDataset ? (
          <DashboardContent
            key={acceptedDataset.revision}
            operations={acceptedDataset.operations}
          />
        ) : (
          <section className="mt-8 rounded-2xl border border-dashed border-outline bg-surface/50 px-6 py-12 text-center">
            <h2 className="text-lg font-semibold">
              Tu dashboard aparecerá aquí
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
              Importa el archivo Excel y acepta los registros válidos para
              consultar indicadores, filtros, gráfico y tabla. No se muestran
              datos de ejemplo.
            </p>
          </section>
        )}
      </div>
      <DashboardFooter />
    </main>
  );
}
