import type { ReactNode } from "react";

export type ChartRow = {
  label: string;
  value: number;
  detail?: string;
};

const chartColors = [
  "#18181b",
  "#52525b",
  "#71717a",
  "#a1a1aa",
  "#d4d4d8",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

function formatChartValue(value: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value);
}

export function BarChart({
  rows,
  valueLabel = "valor",
}: {
  rows: ChartRow[];
  valueLabel?: string;
}) {
  const visibleRows = rows.filter((row) => row.value > 0).slice(0, 10);
  const maximum = Math.max(...visibleRows.map((row) => row.value), 0);
  if (!visibleRows.length) return <p className="text-sm text-zinc-500">No hay datos suficientes para graficar.</p>;
  return (
    <div className="space-y-3" role="img" aria-label={`Gráfico de barras: ${valueLabel}`}>
      {visibleRows.map((row, index) => {
        const percentage = maximum ? Math.max(5, (row.value / maximum) * 100) : 0;
        return (
          <div key={row.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
              <span className="min-w-0 truncate font-medium">{row.label}</span>
              <span className="shrink-0 tabular-nums text-zinc-500">{row.detail ?? formatChartValue(row.value)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${percentage}%`, backgroundColor: chartColors[index % chartColors.length] }}
                aria-hidden="true"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DonutChart({
  rows,
  center,
  valueLabel = "distribución",
}: {
  rows: ChartRow[];
  center?: ReactNode;
  valueLabel?: string;
}) {
  const visibleRows = rows.filter((row) => row.value > 0).slice(0, chartColors.length);
  const total = visibleRows.reduce((sum, row) => sum + row.value, 0);
  if (!visibleRows.length || !total) return <p className="text-sm text-zinc-500">No hay datos suficientes para graficar.</p>;
  let cursor = 0;
  const stops = visibleRows.map((row, index) => {
    const start = cursor;
    cursor += (row.value / total) * 100;
    return `${chartColors[index]} ${start}% ${cursor}%`;
  });
  return (
    <div className="flex items-center gap-5" role="img" aria-label={`Gráfico de pastel: ${valueLabel}`}>
      <div
        className="relative size-32 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${stops.join(", ")})` }}
        aria-hidden="true"
      >
        <div className="absolute inset-5 flex items-center justify-center rounded-full bg-white text-center text-xs font-semibold text-zinc-700">
          {center ?? formatChartValue(total)}
        </div>
      </div>
      <ul className="min-w-0 space-y-2 text-xs">
        {visibleRows.map((row, index) => (
          <li key={row.label} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index] }} aria-hidden="true" />
            <span className="min-w-0 truncate">{row.label}</span>
            <strong className="ml-auto shrink-0 tabular-nums">{row.detail ?? formatChartValue(row.value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
