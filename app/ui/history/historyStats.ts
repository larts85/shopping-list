import { isUnit, type Unit } from "@/app/lib/units";
import type { HistoryItem } from "./historyTypes";

export type NutrientGroupKey =
  | "proteins"
  | "carbohydrates"
  | "vitamins"
  | "minerals"
  | "dairy"
  | "hydration"
  | "other";

export type NutrientGroup = {
  key: NutrientGroupKey;
  label: string;
  description: string;
  items: HistoryItem[];
};

const nutrientDefinitions: Array<
  Omit<NutrientGroup, "items"> & { matches: string[] }
> = [
  {
    key: "proteins",
    label: "Proteínas",
    description: "Carnes, pescados, huevos, legumbres y fuentes proteicas.",
    matches: [
      "carnic", "pescad", "fiambre", "huevo", "pollo", "carne", "cerdo",
      "atun", "salmon", "merluza", "legumbre", "poroto", "lenteja",
      "garbanzo", "soja", "tofu", "mani",
    ],
  },
  {
    key: "carbohydrates",
    label: "Carbohidratos",
    description: "Cereales, harinas, pastas, panificados y tubérculos.",
    matches: [
      "almacen", "arroz", "pasta", "fideo", "harina", "pan", "avena",
      "cereal", "galleta", "papa", "batata", "maiz", "rebozador", "azucar",
    ],
  },
  {
    key: "vitamins",
    label: "Vitaminas y fibra",
    description: "Frutas, verduras y alimentos frescos de origen vegetal.",
    matches: [
      "verduler", "fruta", "frutas", "verdura", "vegetal", "banana", "manzana",
      "tomate", "limon", "jengibre", "espinaca", "zanahoria", "brocoli", "palta",
    ],
  },
  {
    key: "minerals",
    label: "Minerales y micronutrientes",
    description: "Frutos secos, semillas, suplementos y productos funcionales.",
    matches: [
      "dietetica", "fruto seco", "almendra", "nuez", "castana", "semilla", "chia",
      "sesamo", "vitamina", "suplement", "calcio", "hierro", "magnesio", "potasio", "zinc",
    ],
  },
  {
    key: "dairy",
    label: "Lácteos y calcio",
    description: "Leches, yogures, quesos y derivados lácteos.",
    matches: ["lacteo", "leche", "queso", "yogur", "yogurt", "crema", "manteca"],
  },
  {
    key: "hydration",
    label: "Hidratación",
    description: "Agua y bebidas; se muestran por volumen cuando existe.",
    matches: ["bebida", "agua", "soda", "jugo", "gaseosa", "cerveza", "vino"],
  },
  {
    key: "other",
    label: "Otros",
    description: "Artículos sin una afinidad nutricional detectable.",
    matches: [],
  },
];

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

function normalizedText(item: HistoryItem): string {
  return `${itemCategory(item)} ${item.purchase.name ?? ""} ${item.purchase.description ?? ""}`
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function nutrientGroups(items: HistoryItem[]): NutrientGroup[] {
  const grouped = new Map<NutrientGroupKey, HistoryItem[]>();
  for (const definition of nutrientDefinitions) grouped.set(definition.key, []);
  for (const item of items) {
    const text = normalizedText(item);
    const definition = nutrientDefinitions.find(({ matches }) => matches.some((match) => text.includes(match))) ?? nutrientDefinitions[nutrientDefinitions.length - 1];
    grouped.get(definition.key)!.push(item);
  }
  return nutrientDefinitions
    .map(({ matches: _matches, ...definition }) => ({ ...definition, items: grouped.get(definition.key)! }))
    .filter((group) => group.items.length > 0);
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
