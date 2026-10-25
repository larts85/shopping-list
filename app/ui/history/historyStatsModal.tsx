"use client";

import { useRef, useState } from "react";
import { unitLabels } from "@/app/lib/units";
import Modal from "@/shared/components/ui/Modal";
import {
  categoryTotals,
  formatCurrency,
  formatQuantity,
  groupTotal,
  packageTotals,
  quantitySummary,
  unitTotals,
} from "./historyStats";
import type { HistoryItem } from "./historyTypes";
import { MAX_NUTRITION_LOOKUPS, useHistoryNutrition } from "./useHistoryNutrition";
import type { NutritionField, NutritionGroup } from "@/app/lib/nutrition";
import {
  RiCloseLine,
  RiLeafLine,
  RiPriceTag3Line,
  RiScales3Line,
  RiStackLine,
} from "react-icons/ri";

type TabKey = "summary" | "nutrients" | "categories" | "units";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "summary", label: "Resumen" },
  { key: "nutrients", label: "Nutrición" },
  { key: "categories", label: "Categorías" },
  { key: "units", label: "Unidades" },
];

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="mb-3 text-zinc-500">{icon}</div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ProgressList({
  rows,
  total,
}: {
  rows: Array<{ label: string; value: number; detail: string }>;
  total: number;
}) {
  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const percentage = total ? Math.max(4, (row.value / total) * 100) : 0;
        return (
          <div key={row.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{row.label}</span>
              <span className="shrink-0 tabular-nums text-zinc-500">{row.detail}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100" aria-hidden="true">
              <div className="h-full rounded-full bg-zinc-800" style={{ width: `${percentage}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SummaryTab({ items }: { items: HistoryItem[] }) {
  const total = groupTotal(items);
  const quantity = quantitySummary(items);
  const categories = categoryTotals(items);
  const largest = [...items]
    .sort((a, b) => Number(b.purchase.precio_total ?? 0) - Number(a.purchase.precio_total ?? 0))
    .slice(0, 3);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={total.pricedItems ? `${total.complete ? "" : "≈ "}${formatCurrency(total.value)}` : "Sin precios"} icon={<RiPriceTag3Line size={22} />} />
        <StatCard label="Artículos" value={formatQuantity(items.length, 0)} icon={<RiStackLine size={22} />} />
        <StatCard label="Categorías" value={formatQuantity(categories.length, 0)} icon={<RiLeafLine size={22} />} />
        <StatCard label="Unidades físicas" value={formatQuantity(quantity.discrete, 2)} icon={<RiScales3Line size={22} />} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h3 className="text-base font-semibold">Volumen de la compra</h3>
          <p className="mt-1 text-sm text-zinc-500">Una lectura rápida de peso, volumen y unidades discretas.</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3"><span>Peso</span><strong>{quantity.massKg ? `${formatQuantity(quantity.massKg, 3)} kg` : "—"}</strong></div>
            <div className="flex justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3"><span>Volumen</span><strong>{quantity.volumeLt ? `${formatQuantity(quantity.volumeLt, 3)} lt` : "—"}</strong></div>
            <div className="flex justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3"><span>Unidades de inventario</span><strong>{quantity.discrete ? formatQuantity(quantity.discrete, 2) : "—"}</strong></div>
          </div>
        </div>
        <div>
          <h3 className="text-base font-semibold">Mayor impacto en el total</h3>
          <p className="mt-1 text-sm text-zinc-500">Artículos que más aportaron al importe registrado.</p>
          <ul className="mt-4 divide-y divide-zinc-100">
            {largest.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 py-3 text-sm">
                <span className="min-w-0 truncate">{String(item.purchase.name ?? "Producto")}</span>
                <strong className="shrink-0 tabular-nums">{item.purchase.precio_total == null ? "—" : formatCurrency(Number(item.purchase.precio_total))}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const nutritionGroupLabels: Record<NutritionGroup, string> = {
  macros: "Macronutrientes",
  vitamins: "Vitaminas",
  minerals: "Minerales",
};

function nutritionBasisLabel(basis: NutritionField["basis"]): string {
  if (basis === "100ml") return "por 100 ml";
  if (basis === "serving") return "por porción declarada";
  return "por 100 g";
}

function NutritionFields({ fields }: { fields: NutritionField[] }) {
  const groups = (["macros", "vitamins", "minerals"] as NutritionGroup[])
    .map((group) => ({ group, fields: fields.filter((field) => field.group === group) }))
    .filter(({ fields: groupFields }) => groupFields.length);
  return (
    <div className="mt-4 space-y-4">
      {groups.map(({ group, fields: groupFields }) => (
        <div key={group}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{nutritionGroupLabels[group]}</h4>
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {groupFields.map((field) => (
              <div key={field.key} className="rounded-lg bg-zinc-50 px-3 py-2">
                <dt className="text-xs text-zinc-500">{field.label}</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">{formatQuantity(field.value, 2)} {field.unit}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-zinc-400">{nutritionBasisLabel(groupFields[0].basis)}</p>
        </div>
      ))}
    </div>
  );
}

function NutrientsTab({ items }: { items: HistoryItem[] }) {
  const { queries, results, offline, skippedCount } = useHistoryNutrition(items);
  const found = queries.filter((entry) => results[entry.key]?.status === "found");
  const fieldCount = found.reduce((total, entry) => total + (results[entry.key]?.product?.fields.length ?? 0), 0);
  const pending = queries.slice(0, MAX_NUTRITION_LOOKUPS).filter((entry) => !results[entry.key]).length;
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-950">
        Los valores se leen de OpenFoodFacts para cada alimento encontrado y se muestran con la base declarada por la fuente. No se estiman nutrientes a partir del nombre, la categoría, la cantidad comprada ni la unidad.
        <a className="ml-1 font-semibold underline" href="https://world.openfoodfacts.org/" target="_blank" rel="noreferrer">Ver fuente</a>
      </div>
      {offline && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Estás sin conexión. Se muestran únicamente resultados que ya estaban guardados en este dispositivo.
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Alimentos únicos" value={formatQuantity(queries.length, 0)} icon={<RiStackLine size={22} />} />
        <StatCard label="Con fuente" value={formatQuantity(found.length, 0)} icon={<RiLeafLine size={22} />} />
        <StatCard label="Datos disponibles" value={formatQuantity(fieldCount, 0)} icon={<RiScales3Line size={22} />} />
      </div>
      {pending > 0 && <p role="status" className="text-sm text-zinc-500">Consultando {pending} alimento{pending === 1 ? "" : "s"} de forma gradual para respetar el límite de OpenFoodFacts…</p>}
      {skippedCount > 0 && <p className="text-sm text-zinc-500">{skippedCount} alimento{skippedCount === 1 ? "" : "s"} no se consultaron todavía para cuidar el límite de la fuente.</p>}
      <div className="space-y-4">
        {queries.map((entry, index) => {
          const result = results[entry.key];
          const product = result?.product;
          const skipped = index >= MAX_NUTRITION_LOOKUPS && !result;
          return (
            <article key={entry.key} className="rounded-2xl border border-zinc-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold">{entry.query}</h3>
                  {entry.items.length > 1 && <p className="mt-1 text-xs text-zinc-500">Usado en {entry.items.length} artículos de esta compra.</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${product ? "bg-emerald-100 text-emerald-800" : result?.status === "unavailable" || result?.status === "rate_limited" ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-600"}`}>
                  {product ? "Encontrado" : result ? result.status === "not_found" ? "Sin datos" : result.status === "rate_limited" ? "Límite" : "No disponible" : skipped ? "No consultado" : "Pendiente"}
                </span>
              </div>
              {product ? (
                <>
                  <p className="mt-3 text-sm text-zinc-600">{product.productName}{product.brands ? ` · ${product.brands}` : ""}{product.quantity ? ` · ${product.quantity}` : ""}</p>
                  <NutritionFields fields={product.fields} />
                  <a className="mt-4 inline-block text-xs font-medium text-zinc-500 underline" href={product.sourceUrl} target="_blank" rel="noreferrer">Abrir ficha en OpenFoodFacts</a>
                </>
              ) : (
                <p className="mt-3 text-sm text-zinc-500">{result?.message ?? (skipped ? "Se omitió para respetar el límite de consultas de OpenFoodFacts." : "La consulta se realizará al abrir esta pestaña.")}</p>
              )}
            </article>
          );
        })}
      </div>
      {!queries.length && <p className="text-sm text-zinc-500">No hay nombres de alimentos disponibles para consultar.</p>}
    </div>
  );
}

function CategoriesTab({ items }: { items: HistoryItem[] }) {
  const rows = categoryTotals(items).map(([label, value]) => ({
    label,
    value: value.items,
    detail: `${value.items} ${value.items === 1 ? "artículo" : "artículos"} · ${formatQuantity(value.quantity, 2)} un`,
  }));
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Artículos por categoría</h3>
        <p className="mt-1 text-sm text-zinc-500">Cuenta líneas de compra; la cantidad comprada aparece como dato complementario.</p>
      </div>
      <ProgressList rows={rows} total={items.length} />
    </div>
  );
}

function UnitsTab({ items }: { items: HistoryItem[] }) {
  const quantity = quantitySummary(items);
  const unitRows = unitTotals(items).map(([unit, value]) => ({
    label: unitLabels[unit],
    value: value.quantity,
    detail: `${formatQuantity(value.quantity, 3)} ${unit}`,
  }));
  const packages = packageTotals(items);
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold">Medidas normalizadas</h3>
        <p className="mt-1 text-sm text-zinc-500">El peso se convierte a kg y el volumen a litros para poder compararlos.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Peso" value={`${formatQuantity(quantity.massKg, 3)} kg`} icon={<RiScales3Line size={22} />} />
        <StatCard label="Volumen" value={`${formatQuantity(quantity.volumeLt, 3)} lt`} icon={<RiScales3Line size={22} />} />
        <StatCard label="Almacenables" value={`${formatQuantity(quantity.discrete, 2)} un`} icon={<RiStackLine size={22} />} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-4 font-semibold">Por unidad registrada</h3>
          <ProgressList rows={unitRows} total={unitRows.reduce((sum, row) => sum + row.value, 0)} />
        </div>
        <div>
          <h3 className="mb-1 font-semibold">Presentación de almacén</h3>
          <p className="mb-4 text-sm text-zinc-500">Criterio: detectamos cajas, latas, paquetes, botellas y formatos similares escritos en el nombre o descripción; el resto queda como suelto/otro.</p>
          {packages.length ? (
            <ProgressList rows={packages.map(([label, value]) => ({ label, value: value.quantity, detail: `${formatQuantity(value.quantity, 2)} un` }))} total={packages.reduce((sum, [, value]) => sum + value.quantity, 0)} />
          ) : <p className="text-sm text-zinc-500">No hay unidades discretas con una presentación reconocible.</p>}
        </div>
      </div>
    </div>
  );
}

export default function HistoryStatsModal({
  items,
  title,
  onClose,
}: {
  items: HistoryItem[];
  title: string;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("summary");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const renderTab = () => {
    if (activeTab === "nutrients") return <NutrientsTab items={items} />;
    if (activeTab === "categories") return <CategoriesTab items={items} />;
    if (activeTab === "units") return <UnitsTab items={items} />;
    return <SummaryTab items={items} />;
  };
  return (
    <Modal isOpen onClose={onClose} title={`Estadísticas de ${title}`} size="xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">Análisis de compra</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
        </div>
        <button type="button" className="icon-button -mr-2 -mt-2" aria-label="Cerrar estadísticas" onClick={onClose}>
          <RiCloseLine aria-hidden="true" size={22} />
        </button>
      </div>
      <div className="mt-6 overflow-x-auto border-b border-zinc-200">
        <div role="tablist" aria-label="Estadísticas de la compra" className="flex min-w-max gap-1">
          {tabs.map((tab, index) => (
            <button
              key={tab.key}
              ref={(element) => { tabRefs.current[index] = element; }}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`history-panel-${tab.key}`}
              tabIndex={activeTab === tab.key ? 0 : -1}
              className={`border-b-2 px-3 py-3 text-sm font-medium transition-colors ${activeTab === tab.key ? "border-zinc-900 text-zinc-950" : "border-transparent text-zinc-500 hover:text-zinc-900"}`}
              onClick={() => setActiveTab(tab.key)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                event.preventDefault();
                const nextIndex = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
                setActiveTab(tabs[nextIndex].key);
                tabRefs.current[nextIndex]?.focus();
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div id={`history-panel-${activeTab}`} role="tabpanel" className="mt-6 min-h-64">
        {renderTab()}
      </div>
    </Modal>
  );
}

HistoryStatsModal.displayName = "HistoryStatsModal";
