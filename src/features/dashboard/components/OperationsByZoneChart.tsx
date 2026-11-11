"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GroupCount } from "@/domain/operations/Metrics";

interface OperationsByZoneChartProps {
  readonly data: readonly GroupCount<string>[];
}

export function OperationsByZoneChart({ data }: OperationsByZoneChartProps) {
  return (
    <section aria-labelledby="operations-chart-heading" className="rounded-2xl border border-outline bg-surface p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold" id="operations-chart-heading">Operaciones por zona</h2>
        <p className="mt-1 text-sm text-muted">Distribución del conjunto filtrado.</p>
      </div>
      {data.length === 0 ? (
        <p className="grid min-h-64 place-items-center text-sm text-muted">No hay operaciones para representar.</p>
      ) : (
        <>
          <div aria-label="Gráfico de barras con operaciones por zona" className="h-72 w-full" role="img">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 30 }}>
                <CartesianGrid stroke="var(--outline)" vertical={false} />
                <XAxis axisLine={false} angle={-18} dataKey="key" height={48} interval={0} textAnchor="end" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--outline)", borderRadius: 12, color: "var(--foreground)" }}
                  formatter={(value) => [new Intl.NumberFormat("es-CO").format(Number(value ?? 0)), "Operaciones"]}
                  labelFormatter={(label) => `Zona: ${String(label)}`}
                />
                <Bar dataKey="count" fill="var(--accent)" maxBarSize={56} name="Operaciones" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul aria-label="Resumen textual de operaciones por zona" className="sr-only">
            {data.map(({ key, count }) => <li key={key}>{key}: {count} {count === 1 ? "operación" : "operaciones"}</li>)}
          </ul>
        </>
      )}
    </section>
  );
}
