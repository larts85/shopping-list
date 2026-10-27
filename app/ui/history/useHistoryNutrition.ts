"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  normalizeNutritionQuery,
  type NutritionLookup,
} from "@/app/lib/nutrition";
import type { HistoryItem } from "./historyTypes";

const STORAGE_KEY = "shopear:nutrition:openfoodfacts:v1";
const LOCAL_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const NUTRITION_BATCH_SIZE = 8;
export const MAX_NUTRITION_LOOKUPS = NUTRITION_BATCH_SIZE;

type StoredNutrition = Record<string, NutritionLookup>;

export type HistoryNutritionQuery = {
  key: string;
  query: string;
  items: HistoryItem[];
};

const NON_FOOD_CATEGORIES = ["limpieza", "hogar", "bazar", "farmacia", "perfumeria", "electro", "ferreteria", "libreria", "mascota", "jugueteria", "indumentaria"];
const NON_FOOD_ALMACEN_NAMES = [
  "mantel", "embudo", "control remoto", "cortina", "escurridor", "machacador", "balde", "tender", "zapatilla electrica",
  "colador", "cajonero", "abridor", "jarro", "almohadon", "jabon", "detergente", "lavandina", "esponja", "trapo",
  "papel higienico", "papel de cocina", "foco", "lampara", "bateria", "pila", "cable", "pegamento", "percha", "colgador",
];

export function isNutritionFoodItem(item: HistoryItem): boolean {
  const category = normalizeNutritionQuery(String(item.purchase.category_name ?? item.purchase.category ?? ""));
  if (NON_FOOD_CATEGORIES.some((term) => category.includes(term))) return false;
  if (!category.includes("almacen")) return true;
  const text = normalizeNutritionQuery(`${item.purchase.name ?? ""} ${item.purchase.description ?? ""}`);
  return !NON_FOOD_ALMACEN_NAMES.some((term) => text.includes(term));
}

function itemQuery(item: HistoryItem): string {
  return [item.purchase.name, item.purchase.description]
    .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
    .map(String)
    .join(" ")
    .trim()
    .slice(0, 120);
}

function readStoredNutrition(): StoredNutrition {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return {};
    const parsed = JSON.parse(value) as StoredNutrition;
    if (!parsed || typeof parsed !== "object") return {};
    const now = Date.now();
    return Object.fromEntries(
      Object.entries(parsed).filter(([, result]) => {
        const timestamp = result?.cachedAt ? Date.parse(result.cachedAt) : NaN;
        return Number.isFinite(timestamp) && now - timestamp < LOCAL_CACHE_TTL_MS;
      }),
    );
  } catch {
    return {};
  }
}

function writeStoredNutrition(results: StoredNutrition) {
  try {
    const entries = Object.entries(results).slice(-100);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Local storage is an optimization; nutrition remains usable without it.
  }
}

function resultForOffline(query: string): NutritionLookup {
  return {
    query,
    status: "unavailable",
    product: null,
    message: "Estás sin conexión y no hay un resultado guardado para este alimento.",
  };
}

function resultForRateLimit(query: string): NutritionLookup {
  return {
    query,
    status: "rate_limited",
    product: null,
    message: "Se alcanzó el límite temporal de consultas. Los datos guardados siguen disponibles.",
  };
}

export function useHistoryNutrition(items: HistoryItem[]) {
  const foodItems = useMemo(() => items.filter(isNutritionFoodItem), [items]);
  const excludedCount = items.length - foodItems.length;
  const queries = useMemo<HistoryNutritionQuery[]>(() => {
    const grouped = new Map<string, HistoryNutritionQuery>();
    for (const item of foodItems) {
      const query = itemQuery(item);
      const key = normalizeNutritionQuery(query);
      if (!key) continue;
      const current = grouped.get(key);
      if (current) current.items.push(item);
      else grouped.set(key, { key, query, items: [item] });
    }
    return [...grouped.values()];
  }, [foodItems]);
  const queryKey = queries.map((entry) => entry.key).join("|");
  const [results, setResults] = useState<StoredNutrition>({});
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const [offline, setOffline] = useState(false);
  const [visibleCount, setVisibleCount] = useState(NUTRITION_BATCH_SIZE);
  const [retryingKey, setRetryingKey] = useState<string | null>(null);
  const startedQueryKey = useRef("");

  useEffect(() => {
    setResults(readStoredNutrition());
    setCacheLoaded(true);
    setOffline(!navigator.onLine);
    const online = () => setOffline(false);
    const offlineEvent = () => setOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", offlineEvent);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offlineEvent);
    };
  }, [queryKey]);

  useEffect(() => {
    if (!cacheLoaded) return;
    const runKey = `${queryKey}:${visibleCount}`;
    if (startedQueryKey.current === runKey) return;
    startedQueryKey.current = runKey;
    let cancelled = false;
    const storedResults = readStoredNutrition();
    const candidates = queries
      .slice(0, visibleCount)
      .filter((entry) => !storedResults[entry.key]);

    async function load() {
      for (let index = 0; index < candidates.length; index++) {
        if (cancelled) return;
        const entry = candidates[index];
        if (!navigator.onLine) {
          setResults((current) => ({ ...current, [entry.key]: resultForOffline(entry.query) }));
          continue;
        }
        let result: NutritionLookup;
        try {
          const response = await fetch(`/api/nutrition/openfoodfacts?q=${encodeURIComponent(entry.query)}`, {
            cache: "no-store",
          });
          if (response.status === 429) result = resultForRateLimit(entry.query);
          else if (!response.ok) throw new Error("Nutrition request failed");
          else result = (await response.json()) as NutritionLookup;
        } catch {
          result = navigator.onLine
            ? {
                query: entry.query,
                status: "unavailable",
                product: null,
                message: "No se pudo consultar OpenFoodFacts en este momento.",
              }
            : resultForOffline(entry.query);
        }
        if (cancelled) return;
        setResults((current) => {
          const next = { ...current, [entry.key]: result };
          if (result.status === "found" || result.status === "not_found") writeStoredNutrition(next);
          return next;
        });
        if (index < candidates.length - 1) await new Promise((resolve) => setTimeout(resolve, 6_100));
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [cacheLoaded, queryKey, queries, visibleCount]);

  async function retryVariant(
    entryKey: string,
    query: string,
    variant: { query: string; source: "local" | "knowledge_graph" },
  ) {
    if (retryingKey) return;
    setRetryingKey(entryKey);
    try {
      const response = await fetch(`/api/nutrition/openfoodfacts?q=${encodeURIComponent(query)}&variant=${encodeURIComponent(variant.query)}&source=${variant.source}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Nutrition retry failed");
      const result = (await response.json()) as NutritionLookup;
      setResults((current) => {
        const next = { ...current, [entryKey]: result };
        if (result.status === "found" || result.status === "not_found") writeStoredNutrition(next);
        return next;
      });
    } catch {
      setResults((current) => ({
        ...current,
        [entryKey]: {
          query,
          status: "unavailable",
          product: null,
          message: "No se pudo reintentar esta variante.",
        },
      }));
    } finally {
      setRetryingKey(null);
    }
  }

  return {
    queries,
    results,
    offline,
    excludedCount,
    visibleCount,
    loadMore: () => setVisibleCount((current) => Math.min(current + NUTRITION_BATCH_SIZE, queries.length)),
    retryVariant,
    retryingKey,
    skippedCount: Math.max(0, queries.length - visibleCount),
  };
}
