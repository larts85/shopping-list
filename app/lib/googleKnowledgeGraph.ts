import "server-only";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; variants: string[] }>();

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalized(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export async function getKnowledgeGraphVariants(query: string): Promise<string[]> {
  const apiKey = process.env.GOOGLE_KNOWLEDGE_GRAPH_API_KEY?.trim();
  if (!apiKey) return [];
  const key = normalized(query);
  const current = cache.get(key);
  if (current && current.expiresAt > Date.now()) return current.variants;

  const url = new URL("https://kgsearch.googleapis.com/v1/entities:search");
  url.searchParams.set("query", query);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("limit", "5");
  url.searchParams.set("languages", "es");
  url.searchParams.set("indent", "false");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 604_800 },
      signal: controller.signal,
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { itemListElement?: unknown };
    const variants = Array.isArray(data.itemListElement)
      ? data.itemListElement.flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const result = (item as { result?: unknown }).result;
          if (!result || typeof result !== "object") return [];
          const name = text((result as { name?: unknown }).name);
          return name && normalized(name) !== key ? [name] : [];
        })
      : [];
    const unique = [...new Map(variants.map((variant) => [normalized(variant), variant])).values()].slice(0, 3);
    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, variants: unique });
    return unique;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
