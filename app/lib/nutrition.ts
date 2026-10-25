export type NutritionStatus =
  | "found"
  | "not_found"
  | "unavailable"
  | "rate_limited";

export type NutritionGroup = "macros" | "vitamins" | "minerals";

export type NutritionField = {
  key: string;
  label: string;
  group: NutritionGroup;
  value: number;
  unit: string;
  basis: "100g" | "100ml" | "serving";
};

export type NutritionProduct = {
  code: string;
  productName: string;
  genericName: string | null;
  brands: string | null;
  quantity: string | null;
  sourceUrl: string;
  matchScore: number;
  fields: NutritionField[];
};

export type NutritionLookup = {
  query: string;
  status: NutritionStatus;
  product: NutritionProduct | null;
  message: string | null;
  cachedAt?: string;
};

type RawNutriments = Record<string, unknown>;

type RawProduct = {
  code?: unknown;
  product_name?: unknown;
  product_name_es?: unknown;
  product_name_en?: unknown;
  generic_name?: unknown;
  generic_name_es?: unknown;
  brands?: unknown;
  quantity?: unknown;
  nutriments?: unknown;
};

type NutrientDefinition = {
  key: string;
  label: string;
  group: NutritionGroup;
  aliases: string[];
  unit: string;
};

export const nutritionDefinitions: NutrientDefinition[] = [
  { key: "energy-kcal", label: "Energía", group: "macros", aliases: ["energy-kcal"], unit: "kcal" },
  { key: "proteins", label: "Proteínas", group: "macros", aliases: ["proteins"], unit: "g" },
  { key: "carbohydrates", label: "Carbohidratos", group: "macros", aliases: ["carbohydrates"], unit: "g" },
  { key: "fat", label: "Grasas", group: "macros", aliases: ["fat"], unit: "g" },
  { key: "fiber", label: "Fibra", group: "macros", aliases: ["fiber"], unit: "g" },
  { key: "sugars", label: "Azúcares", group: "macros", aliases: ["sugars"], unit: "g" },
  { key: "salt", label: "Sal", group: "macros", aliases: ["salt"], unit: "g" },
  { key: "sodium", label: "Sodio", group: "macros", aliases: ["sodium"], unit: "mg" },
  { key: "vitamin-a", label: "Vitamina A", group: "vitamins", aliases: ["vitamin-a"], unit: "µg" },
  { key: "vitamin-c", label: "Vitamina C", group: "vitamins", aliases: ["vitamin-c"], unit: "mg" },
  { key: "vitamin-d", label: "Vitamina D", group: "vitamins", aliases: ["vitamin-d"], unit: "µg" },
  { key: "vitamin-e", label: "Vitamina E", group: "vitamins", aliases: ["vitamin-e"], unit: "mg" },
  { key: "vitamin-b1", label: "Vitamina B1", group: "vitamins", aliases: ["vitamin-b1", "vitamin-b1-thiamine"], unit: "mg" },
  { key: "vitamin-b2", label: "Vitamina B2", group: "vitamins", aliases: ["vitamin-b2", "vitamin-b2-riboflavin"], unit: "mg" },
  { key: "vitamin-b6", label: "Vitamina B6", group: "vitamins", aliases: ["vitamin-b6"], unit: "mg" },
  { key: "vitamin-b9", label: "Vitamina B9", group: "vitamins", aliases: ["vitamin-b9", "folates"], unit: "µg" },
  { key: "vitamin-b12", label: "Vitamina B12", group: "vitamins", aliases: ["vitamin-b12"], unit: "µg" },
  { key: "calcium", label: "Calcio", group: "minerals", aliases: ["calcium"], unit: "mg" },
  { key: "iron", label: "Hierro", group: "minerals", aliases: ["iron"], unit: "mg" },
  { key: "magnesium", label: "Magnesio", group: "minerals", aliases: ["magnesium"], unit: "mg" },
  { key: "potassium", label: "Potasio", group: "minerals", aliases: ["potassium"], unit: "mg" },
  { key: "zinc", label: "Zinc", group: "minerals", aliases: ["zinc"], unit: "mg" },
  { key: "phosphorus", label: "Fósforo", group: "minerals", aliases: ["phosphorus"], unit: "mg" },
];

function textValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numericValue(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeNutritionQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function queryTokens(value: string): string[] {
  return normalizeNutritionQuery(value)
    .split(" ")
    .filter((token) => token.length > 1 && !["de", "del", "la", "el", "con", "sin", "por"].includes(token));
}

export function nutritionMatchScore(query: string, product: RawProduct): number {
  const queryValue = normalizeNutritionQuery(query);
  const candidate = normalizeNutritionQuery(
    [product.product_name_es, product.product_name, product.product_name_en, product.generic_name_es, product.generic_name, product.brands]
      .map(textValue)
      .filter(Boolean)
      .join(" "),
  );
  if (!queryValue || !candidate) return 0;
  if (candidate === queryValue) return 1;
  const tokens = queryTokens(queryValue);
  if (!tokens.length) return 0;
  const matched = tokens.filter((token) => candidate.includes(token));
  const score = matched.length / tokens.length;
  return candidate.includes(queryValue) ? Math.max(score, 0.9) : score;
}

function nutrientValue(nutriments: RawNutriments, aliases: string[]) {
  for (const alias of aliases) {
    for (const basis of ["100g", "100ml", "serving"] as const) {
      const value = numericValue(nutriments[`${alias}_${basis}`]);
      if (value === null || value < 0) continue;
      const unit = textValue(nutriments[`${alias}_unit`]);
      return { value, unit, basis };
    }
  }
  return null;
}

export function extractNutritionFields(nutriments: RawNutriments): NutritionField[] {
  return nutritionDefinitions.flatMap((definition) => {
    const found = nutrientValue(nutriments, definition.aliases);
    if (!found) return [];
    return [{
      key: definition.key,
      label: definition.label,
      group: definition.group,
      value: found.value,
      unit: found.unit ?? definition.unit,
      basis: found.basis,
    }];
  });
}

function productName(product: RawProduct): string | null {
  return textValue(product.product_name_es) ?? textValue(product.product_name) ?? textValue(product.product_name_en);
}

export function normalizeNutritionProduct(query: string, product: RawProduct): NutritionProduct | null {
  const name = productName(product);
  const code = textValue(product.code);
  if (!name || !code || !product.nutriments || typeof product.nutriments !== "object") return null;
  const fields = extractNutritionFields(product.nutriments as RawNutriments);
  if (!fields.length) return null;
  return {
    code,
    productName: name,
    genericName: textValue(product.generic_name_es) ?? textValue(product.generic_name),
    brands: textValue(product.brands),
    quantity: textValue(product.quantity),
    sourceUrl: `https://world.openfoodfacts.org/product/${encodeURIComponent(code)}`,
    matchScore: nutritionMatchScore(query, product),
    fields,
  };
}

export function chooseNutritionProduct(query: string, products: RawProduct[]): NutritionProduct | null {
  const best = products
    .map((product) => normalizeNutritionProduct(query, product))
    .filter((product): product is NutritionProduct => product !== null)
    .sort((a, b) => b.matchScore - a.matchScore || b.fields.length - a.fields.length)[0] ?? null;
  return best && best.matchScore >= 0.5 ? best : null;
}
