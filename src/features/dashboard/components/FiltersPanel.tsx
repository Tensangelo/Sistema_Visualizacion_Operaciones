import type { OperationFilters } from "@/domain/operations/Metrics";
import type { OperationStatus } from "@/domain/operations/Operation";
import { statusLabel } from "@/features/dashboard/hooks/UseDashboardData";

interface FiltersPanelProps {
  readonly filters: OperationFilters;
  readonly zones: readonly string[];
  readonly serviceTypes: readonly string[];
  readonly onChange: (filters: OperationFilters) => void;
  readonly onReset: () => void;
  readonly resultCount: number;
  readonly totalCount: number;
}

const statuses: readonly OperationStatus[] = ["completed", "incident", "cancelled"];

function isOperationStatus(value: string): value is OperationStatus {
  return statuses.some((status) => status === value);
}

export function FiltersPanel({
  filters,
  zones,
  serviceTypes,
  onChange,
  onReset,
  resultCount,
  totalCount,
}: FiltersPanelProps) {
  return (
    <section
      aria-labelledby="filters-heading"
      className="rounded-2xl border border-outline bg-surface p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" id="filters-heading">Filtros</h2>
          <p className="mt-1 text-sm text-muted">Combina criterios para explorar las operaciones.</p>
        </div>
        <div className="flex items-center gap-3">
          <p aria-live="polite" className="text-sm text-muted">
            <span className="font-semibold text-foreground">{resultCount}</span> de {totalCount} operaciones
          </p>
          <button
            className="min-h-11 rounded-lg border border-outline px-3 text-sm font-medium hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={onReset}
            type="button"
          >
            Restablecer
          </button>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium" htmlFor="filter-zone">
          Zona
          <select
            className="min-h-11 rounded-lg border border-outline bg-background px-3 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            id="filter-zone"
            onChange={(event) => onChange({ ...filters, zone: event.target.value || undefined })}
            value={filters.zone ?? ""}
          >
            <option value="">Todas las zonas</option>
            {zones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium" htmlFor="filter-service">
          Tipo de servicio
          <select
            className="min-h-11 rounded-lg border border-outline bg-background px-3 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            id="filter-service"
            onChange={(event) => onChange({ ...filters, serviceType: event.target.value || undefined })}
            value={filters.serviceType ?? ""}
          >
            <option value="">Todos los servicios</option>
            {serviceTypes.map((service) => <option key={service} value={service}>{service}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium" htmlFor="filter-status">
          Estado
          <select
            className="min-h-11 rounded-lg border border-outline bg-background px-3 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            id="filter-status"
            onChange={(event) => {
              const value = event.target.value;
              onChange({ ...filters, status: isOperationStatus(value) ? value : undefined });
            }}
            value={filters.status ?? ""}
          >
            <option value="">Todos los estados</option>
            {statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}
