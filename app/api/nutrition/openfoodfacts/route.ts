import { NextResponse } from "next/server";
import { apiError } from "@/app/lib/apiError";
import { identity, DataError } from "@/app/lib/database";
import { getKnowledgeGraphVariants } from "@/app/lib/googleKnowledgeGraph";
import {
  chooseNutritionProduct,
  normalizeNutritionQuery,
  nutritionQueryVariants,
  type NutritionLookup,
} from "@/app/lib/nutrition";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_EXTERNAL_SEARCHES_PER_MINUTE = 8;
const cache = new Map<string, { expiresAt: number; value: NutritionLookup }>();
const inFlight = new Map<string, Promise<NutritionLookup>>();
const externalSearches: number[] = [];

function canSearch() {
  const now = Date.now();
  while (externalSearches[0] !== undefined && externalSearches[0] <= now - 60_000) externalSearches.shift();
  if (externalSearches.length >= MAX_EXTERNAL_SEARCHES_PER_MINUTE) return false;
  externalSearches.push(now);
  return true;
}

async function fetchNutritionVariant(
  query: string,
  variant: string,
  attempts: string[],
  variantSource: "local" | "knowledge_graph",
): Promise<NutritionLookup | null> {
  if (!canSearch()) {
    return {
      query,
      status: "rate_limited",
      product: null,
      message: "Se alcanzó el límite temporal de consultas. Podés volver a intentarlo más tarde.",
      attempts,
      matchedQuery: null,
      variantSource: null,
    };
  }
  attempts.push(variant);

  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", variant);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "8");
  url.searchParams.set(
    "fields",
    "code,product_name,product_name_es,nutriments",
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Shopear/1.0 (https://shopear.dyarthi.com.ar)",
      },
      next: { revalidate: 86_400 },
      signal: controller.signal,
    });
    if (response.status === 429) {
      return {
        query,
        status: "rate_limited",
        product: null,
        message: "OpenFoodFacts pidió esperar antes de realizar otra búsqueda.",
      };
    }
    if (!response.ok) throw new Error(`OpenFoodFacts responded with ${response.status}`);
    const data = (await response.json()) as { products?: unknown };
    const products = Array.isArray(data.products) ? data.products : [];
    const product = chooseNutritionProduct(variant, products.filter((item): item is Record<string, unknown> => !!item && typeof item === "object"));
    return product ? {
      query,
      status: "found",
      product,
      message: null,
      attempts,
      matchedQuery: variant,
      variantSource,
      cachedAt: new Date().toISOString(),
    } : null;
  } catch (error) {
    console.warn("OpenFoodFacts nutrition lookup unavailable", {
      query,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      query,
      status: "unavailable",
      product: null,
      message: "No se pudo consultar OpenFoodFacts. Se conserva cualquier resultado guardado en este dispositivo.",
      attempts,
      matchedQuery: null,
      variantSource: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchNutrition(query: string): Promise<NutritionLookup> {
  const attempts: string[] = [];
  const localVariants = nutritionQueryVariants(query);
  const knowledgeGraphVariants = await getKnowledgeGraphVariants(query);
  const variants = [
    ...localVariants.map((variant) => ({ variant, source: "local" as const })),
    ...knowledgeGraphVariants.map((variant) => ({ variant, source: "knowledge_graph" as const })),
  ];
  for (const { variant, source } of variants) {
    const result = await fetchNutritionVariant(query, variant, attempts, source);
    if (result) return result;
  }
  return {
    query,
    status: "not_found",
    product: null,
    message: attempts.length > 1
      ? `No encontramos datos suficientes después de probar ${attempts.length} nombres posibles.`
      : "No encontramos una coincidencia confiable con datos nutricionales suficientes.",
    attempts,
    matchedQuery: null,
    variantSource: null,
    cachedAt: new Date().toISOString(),
  };
}

async function lookup(query: string): Promise<NutritionLookup> {
  const key = normalizeNutritionQuery(query);
  const current = cache.get(key);
  if (current && current.expiresAt > Date.now()) return { ...current.value, cachedAt: current.value.cachedAt };

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = fetchNutrition(query).then((value) => {
    if (value.status === "found" || value.status === "not_found") {
      cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
    }
    inFlight.delete(key);
    return value;
  }).catch((error) => {
    inFlight.delete(key);
    throw error;
  });
  inFlight.set(key, request);
  return request;
}

export async function GET(request: Request) {
  try {
    await identity();
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (!query || query.length > 120) throw new DataError("El alimento no es válido");
    return NextResponse.json(await lookup(query), {
      headers: {
        "Cache-Control": "private, max-age=300",
        Vary: "Cookie",
      },
    });
  } catch (error) {
    return apiError(error, request);
  }
}
