import type { Money } from "@/domain/money/Money";
import type { Rate } from "@/domain/operations/Metrics";
import { formatMoney } from "@/shared/formatters/FormatMoney";

interface KpiGridProps {
  readonly totalOperations: number;
  readonly revenue: readonly Money[];
  readonly margin: readonly Money[];
  readonly costs: readonly Money[];
  readonly sla: Rate;
}

function MoneyValues({ values }: { readonly values: readonly Money[] }) {
  if (values.length === 0) return <span>—</span>;
  return (
    <ul className="space-y-1">
      {values.map((value) => (
        <li key={value.currency}>{formatMoney(value)}</li>
      ))}
    </ul>
  );
}

export function KpiGrid({ totalOperations, revenue, margin, costs, sla }: KpiGridProps) {
  const percentage = sla.percentage === null
    ? "No calculable"
    : new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 2 }).format(sla.percentage / 100);

  return (
    <section aria-labelledby="kpi-heading" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <h2 className="sr-only" id="kpi-heading">Indicadores principales</h2>
      <article className="rounded-2xl border border-outline bg-surface p-5">
        <h3 className="text-sm font-medium text-muted">Operaciones</h3>
        <p className="mt-3 text-3xl font-semibold tabular-nums">{totalOperations}</p>
        <p className="mt-2 text-xs text-muted">Registros del conjunto filtrado</p>
      </article>
      <article className="rounded-2xl border border-outline bg-surface p-5">
        <h3 className="text-sm font-medium text-muted">Ingresos</h3>
        <div className="mt-3 min-h-9 break-all text-xl font-semibold leading-7"><MoneyValues values={revenue} /></div>
        <p className="mt-2 text-xs text-muted">Agrupados por moneda</p>
      </article>
      <article className="rounded-2xl border border-outline bg-surface p-5">
        <h3 className="text-sm font-medium text-muted">Margen calculado</h3>
        <div className="mt-3 min-h-9 break-all text-xl font-semibold leading-7"><MoneyValues values={margin} /></div>
        <p className="mt-2 text-xs text-muted">Ingresos menos costos</p>
      </article>
      <article className="rounded-2xl border border-outline bg-surface p-5">
        <h3 className="text-sm font-medium text-muted">Cumplimiento SLA</h3>
        <p className="mt-3 text-3xl font-semibold tabular-nums">{percentage}</p>
        <p className="mt-2 text-xs text-muted">{sla.numerator} de {sla.denominator} operaciones</p>
      </article>
      <div className="text-sm text-muted sm:col-span-2 xl:col-span-4">
        Costos del conjunto: <div className="font-medium text-foreground"><MoneyValues values={costs} /></div>
      </div>
    </section>
  );
}
