import type { NutritionField, NutritionGroup, NutritionLookup } from "@/app/lib/nutrition";
import type { HistoryNutritionQuery } from "./useHistoryNutrition";

export type NutritionEntry = HistoryNutritionQuery & {
  result: NutritionLookup;
};

export type NutritionAggregate = {
  key: string;
  label: string;
  group: NutritionGroup;
  foods: number;
  observations: number;
  units: string[];
  bases: string[];
};

export function foundNutritionEntries(
  queries: HistoryNutritionQuery[],
  results: Record<string, NutritionLookup>,
): NutritionEntry[] {
  return queries.flatMap((query) => {
    const result = results[query.key];
    return result?.status === "found" && result.product ? [{ ...query, result }] : [];
  });
}

export function nutritionAggregates(entries: NutritionEntry[]): NutritionAggregate[] {
  const aggregates = new Map<string, NutritionAggregate>();
  for (const entry of entries) {
    for (const field of entry.result.product?.fields ?? []) {
      const current = aggregates.get(field.key) ?? {
        key: field.key,
        label: field.label,
        group: field.group,
        foods: 0,
        observations: 0,
        units: [],
        bases: [],
      };
      current.foods += 1;
      current.observations += 1;
      if (!current.units.includes(field.unit)) current.units.push(field.unit);
      if (!current.bases.includes(field.basis)) current.bases.push(field.basis);
      aggregates.set(field.key, current);
    }
  }
  return [...aggregates.values()].sort((a, b) => b.foods - a.foods || a.label.localeCompare(b.label, "es"));
}

export function fieldsByFood(entries: NutritionEntry[]) {
  return entries
    .map((entry) => ({
      label: entry.result.product?.productName ?? entry.query,
      value: entry.result.product?.fields.length ?? 0,
      detail: `${entry.result.product?.fields.length ?? 0} datos`,
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "es"));
}

export function groupFieldCounts(entries: NutritionEntry[]) {
  const labels: Record<NutritionGroup, string> = {
    macros: "Macronutrientes",
    vitamins: "Vitaminas",
    minerals: "Minerales",
  };
  const counts = new Map<NutritionGroup, number>();
  for (const entry of entries) {
    for (const field of entry.result.product?.fields ?? []) counts.set(field.group, (counts.get(field.group) ?? 0) + 1);
  }
  return (["macros", "vitamins", "minerals"] as NutritionGroup[]).map((group) => ({
    label: labels[group],
    value: counts.get(group) ?? 0,
    detail: `${counts.get(group) ?? 0} datos`,
  }));
}

export function nutritionStatusCounts(
  queries: HistoryNutritionQuery[],
  results: Record<string, NutritionLookup>,
  visibleCount: number,
) {
  const counts = new Map<string, number>();
  for (const [index, query] of queries.entries()) {
    const status = results[query.key]?.status;
    const label = status === "found"
      ? "Encontrados"
      : status === "not_found"
        ? "Sin datos"
        : status === "unavailable" || status === "rate_limited"
          ? "No disponibles"
          : index < visibleCount
            ? "Pendientes"
            : "No consultados";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, value]) => ({ label, value, detail: `${value} alimentos` }));
}

export function fieldsForAggregate(field: NutritionAggregate, entries: NutritionEntry[]): NutritionField[] {
  return entries.flatMap((entry) => entry.result.product?.fields.filter((item) => item.key === field.key) ?? []);
}
