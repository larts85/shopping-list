import { isUnit, type Unit } from "@/app/lib/units";
import type { HistoryItem } from "./historyTypes";

const unitFactors: Record<Unit, { kind: "mass" | "volume" | "discrete"; factor: number }> = {
  kg: { kind: "mass", factor: 1 },
  g: { kind: "mass", factor: 0.001 },
  mg: { kind: "mass", factor: 0.000001 },
  lt: { kind: "volume", factor: 1 },
  ml: { kind: "volume", factor: 0.001 },
  un: { kind: "discrete", factor: 1 },
  comp: { kind: "discrete", factor: 1 },
};

export function numberValue(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function itemQuantity(item: HistoryItem): number {
  return numberValue(item.purchase.cantidad) ?? 1;
}

function itemMeasure(item: HistoryItem): number {
  return numberValue(item.purchase.medida) ?? 1;
}

export function itemTotal(item: HistoryItem): number | null {
  const storedTotal = numberValue(item.purchase.precio_total);
  if (storedTotal !== null) return storedTotal;
  const price = numberValue(item.purchase.precio);
  return price === null ? null : price * itemQuantity(item);
}

export function groupTotal(items: HistoryItem[]) {
  let value = 0;
  let pricedItems = 0;
  for (const item of items) {
    const total = itemTotal(item);
    if (total === null) continue;
    value += total;
    pricedItems++;
  }
  return { value, pricedItems, complete: pricedItems === items.length };
}

export function itemCategory(item: HistoryItem): string {
  const category = item.purchase.category_name ?? item.purchase.category;
  return typeof category === "string" && category.trim()
    ? category.trim()
    : "Sin categoría";
}

export function itemUnit(item: HistoryItem): Unit | null {
  return isUnit(item.purchase.unit) ? item.purchase.unit : null;
}

export function quantitySummary(items: HistoryItem[]) {
  return items.reduce(
    (summary, item) => {
      const unit = itemUnit(item);
      const definition = unit ? unitFactors[unit] : unitFactors.un;
      const quantity = itemQuantity(item) * itemMeasure(item) * definition.factor;
      summary[definition.kind === "mass" ? "massKg" : definition.kind === "volume" ? "volumeLt" : "discrete"] += quantity;
      return summary;
    },
    { massKg: 0, volumeLt: 0, discrete: 0 },
  );
}

export function unitTotals(items: HistoryItem[]) {
  const totals = new Map<Unit, { quantity: number; items: number }>();
  for (const item of items) {
    const unit = itemUnit(item) ?? "un";
    const current = totals.get(unit) ?? { quantity: 0, items: 0 };
    current.quantity += itemQuantity(item) * itemMeasure(item);
    current.items++;
    totals.set(unit, current);
  }
  return [...totals.entries()].sort(([, a], [, b]) => b.quantity - a.quantity);
}

const packagePatterns: Array<[string, RegExp]> = [
  ["Cajas", /\bcaj(?:a|as)\b/],
  ["Latas", /\blat(?:a|as)\b/],
  ["Paquetes", /\bpaquet(?:e|es)\b|\bpack(?:s)?\b/],
  ["Botellas", /\bbotell(?:a|as)\b/],
  ["Frascos", /\bfrasc(?:o|os)\b/],
  ["Bolsas", /\bbols(?:a|as)\b/],
  ["Sachets", /\bsachet(?:s)?\b/],
  ["Blísters", /\bbl[ií]ster(?:s)?\b/],
  ["Rollos", /\broll(?:o|os)\b/],
  ["Potes", /\bpot(?:e|es)\b/],
];

export function packageTotals(items: HistoryItem[]) {
  const totals = new Map<string, { quantity: number; items: number }>();
  for (const item of items) {
    const unit = itemUnit(item);
    if (!unit || !["un", "comp"].includes(unit)) continue;
    const haystack = `${item.purchase.name ?? ""} ${item.purchase.description ?? ""}`
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const label = packagePatterns.find(([, pattern]) => pattern.test(haystack))?.[0] ?? "Sueltas / otras";
    const current = totals.get(label) ?? { quantity: 0, items: 0 };
    current.quantity += itemQuantity(item);
    current.items++;
    totals.set(label, current);
  }
  return [...totals.entries()].sort(([, a], [, b]) => b.quantity - a.quantity);
}

export function categoryTotals(items: HistoryItem[]) {
  const totals = new Map<string, { quantity: number; items: number }>();
  for (const item of items) {
    const category = itemCategory(item);
    const current = totals.get(category) ?? { quantity: 0, items: 0 };
    current.quantity += itemQuantity(item);
    current.items++;
    totals.set(category, current);
  }
  return [...totals.entries()].sort(([, a], [, b]) => b.items - a.items || b.quantity - a.quantity);
}

export function formatQuantity(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits }).format(value);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(value);
}
