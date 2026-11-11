"use client";

import { useState } from "react";
import type { Operation } from "@/domain/operations/Operation";
import { subtractMoney } from "@/domain/money/Decimal";
import { formatMoney } from "@/shared/formatters/FormatMoney";
import { formatPlainDate } from "@/shared/formatters/FormatPlainDate";
import { statusLabel } from "@/features/dashboard/hooks/UseDashboardData";

const pageSize = 10;

interface OperationsTableProps {
  readonly operations: readonly Operation[];
}

function OperationRow({ operation }: { readonly operation: Operation }) {
  const margin = subtractMoney(operation.revenue, operation.cost);
  return (
    <tr className="hover:bg-background/40">
      <th className="whitespace-nowrap px-4 py-3 font-medium" scope="row">{operation.id}</th>
      <td className="whitespace-nowrap px-4 py-3 text-muted">{formatPlainDate(operation.date)}</td>
      <td className="px-4 py-3">{operation.zone}</td>
      <td className="px-4 py-3">{operation.serviceType}</td>
      <td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle(operation.status)}`}>{statusLabel(operation.status)}</span></td>
      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatMoney(operation.revenue)}</td>
      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatMoney(operation.cost)}</td>
      <td className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${margin.amount.startsWith("-") ? "text-red-300" : ""}`}>{formatMoney(margin)}</td>
      <td className="whitespace-nowrap px-4 py-3">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${operation.slaCompliant ? "bg-accent/10 text-accent" : "bg-red-950/70 text-red-200"}`}>
          {operation.slaCompliant ? "Cumple" : "No cumple"}
        </span>
      </td>
    </tr>
  );
}

function statusStyle(status: Operation["status"]): string {
  if (status === "completed") return "bg-accent/10 text-accent";
  if (status === "incident") return "bg-amber-950/70 text-amber-200";
  return "bg-slate-800 text-slate-200";
}

export function OperationsTable({ operations }: OperationsTableProps) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(operations.length / pageSize));
  const visible = operations.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <section aria-labelledby="operations-table-heading" className="rounded-2xl border border-outline bg-surface">
      <div className="flex flex-wrap items-end justify-between gap-3 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold" id="operations-table-heading">Registros operacionales</h2>
          <p className="mt-1 text-sm text-muted">{operations.length} operaciones en el resultado actual.</p>
        </div>
        {operations.length > pageSize && (
          <nav aria-label="Paginación de operaciones" className="flex items-center gap-2">
            <button
              aria-label="Página anterior"
              className="min-h-11 rounded-lg border border-outline px-3 text-sm hover:border-accent disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              type="button"
            >Anterior</button>
            <span aria-live="polite" className="min-w-20 text-center text-sm text-muted">{page + 1} / {pageCount}</span>
            <button
              aria-label="Página siguiente"
              className="min-h-11 rounded-lg border border-outline px-3 text-sm hover:border-accent disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
              type="button"
            >Siguiente</button>
          </nav>
        )}
      </div>
      <div
        aria-label="Tabla de operaciones, con desplazamiento horizontal en pantallas pequeñas."
        className="overflow-x-auto border-t border-outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        role="region"
        tabIndex={0}
      >
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <caption className="sr-only">Operaciones del conjunto filtrado</caption>
            <thead className="bg-background/70 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold" scope="col">ID operación</th>
                <th className="px-4 py-3 font-semibold" scope="col">Fecha</th>
                <th className="px-4 py-3 font-semibold" scope="col">Zona</th>
                <th className="px-4 py-3 font-semibold" scope="col">Servicio</th>
                <th className="px-4 py-3 font-semibold" scope="col">Estado</th>
                <th className="px-4 py-3 text-right font-semibold" scope="col">Ingresos</th>
                <th className="px-4 py-3 text-right font-semibold" scope="col">Costos</th>
                <th className="px-4 py-3 text-right font-semibold" scope="col">Margen</th>
                <th className="px-4 py-3 font-semibold" scope="col">SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline">
              {operations.length === 0 ? (
                <tr>
                  <td className="px-5 py-14 text-center text-sm text-muted" colSpan={9}>
                    No hay operaciones que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                visible.map((operation) => <OperationRow key={operation.id} operation={operation} />)
              )}
            </tbody>
          </table>
      </div>
    </section>
  );
}
