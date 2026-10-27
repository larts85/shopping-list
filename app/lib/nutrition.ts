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
  attempts?: string[];
  matchedQuery?: string | null;
  variantSource?: "local" | "knowledge_graph" | null;
  nextVariants?: Array<{ query: string; source: "local" | "knowledge_graph" }>;
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

export const ARGENTINE_VEGETABLE_VARIANTS: Array<[string, string]> = [
  ["aguacate", "palta"],
  ["avocado", "palta"],
  ["pimiento", "morrón"],
  ["morrón", "pimiento"],
  ["bell pepper", "morrón"],
  ["sweet pepper", "morrón"],
  ["chile dulce", "morrón"],
  ["capsicum", "morrón"],
  ["chili pepper", "ají"],
  ["hot pepper", "ají picante"],
  ["chilli", "ají"],
  ["jalapeno", "jalapeño"],
  ["jalapeño pepper", "jalapeño"],
  ["calabacín", "zapallito"],
  ["courgette", "zapallito"],
  ["zucchini squash", "zapallito"],
  ["summer squash", "zapallito"],
  ["calabaza", "zapallo"],
  ["pumpkin", "zapallo"],
  ["squash", "zapallo"],
  ["butternut squash", "zapallo anco"],
  ["butternut", "zapallo anco"],
  ["acorn squash", "zapallo"],
  ["kabocha", "kabutia"],
  ["kabocha squash", "kabutia"],
  ["spaghetti squash", "zapallo spaghetti"],
  ["chayote", "papa del aire"],
  ["chayote squash", "papa del aire"],
  ["patata", "papa"],
  ["potato", "papa"],
  ["white potato", "papa"],
  ["russet potato", "papa"],
  ["boniato", "batata"],
  ["sweet potato", "batata"],
  ["camote", "batata"],
  ["moniato", "batata"],
  ["cassava", "mandioca"],
  ["manioc", "mandioca"],
  ["yuca", "mandioca"],
  ["yucca root", "mandioca"],
  ["green bean", "chaucha"],
  ["green beans", "chauchas"],
  ["string bean", "chaucha"],
  ["string beans", "chauchas"],
  ["snap bean", "chaucha"],
  ["snap beans", "chauchas"],
  ["haricot bean", "chaucha"],
  ["haricot beans", "chauchas"],
  ["ejote", "chaucha"],
  ["ejotes", "chauchas"],
  ["judía", "chaucha"],
  ["judía verde", "chaucha"],
  ["habichuela", "chaucha"],
  ["vainita", "chaucha"],
  ["poroto verde", "chaucha"],
  ["snow pea", "arveja china"],
  ["sugar snap pea", "arveja"],
  ["sugar snap peas", "arvejas"],
  ["alubia", "poroto"],
  ["alubias", "porotos"],
  ["bean", "poroto"],
  ["beans", "porotos"],
  ["kidney bean", "poroto colorado"],
  ["kidney beans", "porotos colorados"],
  ["red kidney bean", "poroto colorado"],
  ["black bean", "poroto negro"],
  ["black beans", "porotos negros"],
  ["pinto bean", "poroto"],
  ["navy bean", "poroto blanco"],
  ["lima bean", "poroto pallares"],
  ["lima beans", "porotos pallares"],
  ["frijol", "poroto"],
  ["frijoles", "porotos"],
  ["guisante", "arveja"],
  ["guisantes", "arvejas"],
  ["pea", "arveja"],
  ["peas", "arvejas"],
  ["green pea", "arveja"],
  ["green peas", "arvejas"],
  ["chícharo", "arveja"],
  ["chícharos", "arvejas"],
  ["fava bean", "haba"],
  ["fava beans", "habas"],
  ["broad bean", "haba"],
  ["broad beans", "habas"],
  ["maize", "maíz"],
  ["corn", "choclo"],
  ["sweet corn", "choclo"],
  ["corn on the cob", "choclo"],
  ["corn cob", "choclo"],
  ["corn kernel", "grano de choclo"],
  ["corn kernels", "granos de choclo"],
  ["elote", "choclo"],
  ["mazorca", "choclo"],
  ["popcorn", "pochoclo"],
  ["popcorn kernels", "maíz pisingallo"],
  ["artichoke", "alcaucil"],
  ["artichokes", "alcauciles"],
  ["globe artichoke", "alcaucil"],
  ["jerusalem artichoke", "topinambur"],
  ["celery", "apio"],
  ["celeriac", "apio nabo"],
  ["celery root", "apio nabo"],
  ["fennel bulb", "hinojo"],
  ["fennel", "hinojo"],
  ["leek", "puerro"],
  ["spring onion", "cebolla de verdeo"],
  ["scallion", "cebolla de verdeo"],
  ["green onion", "cebolla de verdeo"],
  ["chives", "ciboulette"],
  ["shallot", "echalote"],
  ["red cabbage", "repollo colorado"],
  ["purple cabbage", "repollo colorado"],
  ["white cabbage", "repollo blanco"],
  ["cabbage", "repollo"],
  ["brussels sprouts", "repollitos de bruselas"],
  ["brussels sprout", "repollito de bruselas"],
  ["kale", "col crespa"],
  ["curly kale", "col crespa"],
  ["collard greens", "col crespa"],
  ["swiss chard", "acelga"],
  ["chard", "acelga"],
  ["chicory", "radicheta"],
  ["endive", "endivia"],
  ["escarole", "escarola"],
  ["radicchio", "achicoria roja"],
  ["daikon", "rabanito japonés"],
  ["radish", "rabanito"],
  ["white radish", "rabanito"],
  ["turnip", "nabo"],
  ["beetroot", "remolacha"],
  ["beet", "remolacha"],
  ["parsnip", "chirivía"],
  ["rutabaga", "nabo sueco"],
  ["okra", "ocra"],
  ["lady's finger", "ocra"],
  ["mushroom", "champiñón"],
  ["mushrooms", "hongos"],
  ["button mushroom", "champiñón"],
  ["portobello mushroom", "portobello"],
  ["oyster mushroom", "gírgola"],
  ["oyster mushrooms", "gírgolas"],
  ["pleurotus", "gírgola"],
  ["enoki mushroom", "hongo enoki"],
  ["shiitake mushroom", "hongo shiitake"],
  ["truffle", "trufa"],
  ["watercress", "berro"],
  ["rocket leaves", "rúcula"],
  ["arugula", "rúcula"],
  ["sorrel", "acedera"],
  ["purslane", "verdolaga"],
  ["mustard greens", "hojas de mostaza"],
  ["tomatillo", "tomate verde"],
  ["cherry tomato", "tomate cherry"],
  ["grape tomato", "tomate cherry"],
  ["red pepper flakes", "ají molido"],
  ["coriander", "cilantro"],
  ["coriandro", "cilantro"],
  ["ginger root", "jengibre"],
  ["turmeric root", "cúrcuma"],
  ["alfalfa sprouts", "brotes de alfalfa"],
  ["bean sprouts", "brotes de soja"],
  ["soybean sprouts", "brotes de soja"],
  ["nopal", "tuna"],
  ["cactus pear", "tuna"],
  ["olive", "aceituna"],
  ["olives", "aceitunas"],
  ["capers", "alcaparras"],
  ["sea asparagus", "espárrago de mar"],
  ["water spinach", "espinaca de agua"],
  ["plantain", "banana"],
  ["banana plantain", "plátano"],
  ["taro", "malanga"],
  ["yam", "ñame"],
  ["jicama", "jícama"],
  ["chayote fruit", "papa del aire"],
  ["breadfruit", "fruta de pan"],
  ["cassava flour", "harina de mandioca"],
  ["tapioca root", "mandioca"],
  ["broccoli rabe", "brócoli de rapa"],
  ["broccolini", "brocolini"],
  ["bimi", "brocolini"],
  ["bok choy", "pak choi"],
  ["pak choi", "pak choi"],
  ["napa cabbage", "repollo chino"],
  ["chinese cabbage", "repollo chino"],
  ["watermelon", "sandía"],
  ["cantaloupe", "melón"],
  ["melon", "melón"],
  ["papaya", "mamón"],
  ["papaw", "mamón"],
  ["pawpaw", "mamón"],
  ["passion fruit", "maracuyá"],
  ["passionfruit", "maracuyá"],
  ["star fruit", "carambola"],
  ["starfruit", "carambola"],
  ["gooseberry", "uchuva"],
  ["blackberry", "mora"],
  ["raspberry", "frambuesa"],
  ["strawberry", "frutilla"],
  ["peach", "durazno"],
  ["apricot", "damasco"],
  ["plum", "ciruela"],
  ["pineapple", "ananá"],
  ["grapefruit", "pomelo"],
  ["tangerine", "mandarina"],
  ["lime", "lima"],
  ["quince", "membrillo"],
  ["persimmon", "caqui"],
  ["loquat", "níspero"],
  ["kumquat", "quinoto"],
  ["pomegranate", "granada"],
  ["fig", "higo"],
  ["figs", "higos"],
  ["mulberry", "mora"],
  ["cranberry", "arándano rojo"],
  ["blueberry", "arándano"],
  ["black currant", "grosella negra"],
  ["red currant", "grosella"],
  ["goji berry", "baya de goji"],
  ["dragon fruit", "pitahaya"],
  ["prickly pear", "tuna"],
];

export const ARGENTINE_ANIMAL_PROTEIN_VARIANTS: Array<[string, string]> = [
  ["beef", "carne vacuna"],
  ["beef meat", "carne vacuna"],
  ["steak", "bife"],
  ["beef steak", "bife"],
  ["sirloin", "lomo"],
  ["tenderloin", "lomo"],
  ["minced beef", "carne picada"],
  ["ground beef", "carne picada"],
  ["ground meat", "carne picada"],
  ["veal", "carne de ternera"],
  ["pork", "carne de cerdo"],
  ["pork meat", "carne de cerdo"],
  ["pork belly", "panceta"],
  ["bacon", "panceta"],
  ["pork sausage", "chorizo de cerdo"],
  ["turkey", "pavo"],
  ["duck meat", "pato"],
  ["lamb", "cordero"],
  ["mutton", "cordero"],
  ["goat meat", "cabrito"],
  ["rabbit meat", "conejo"],
  ["venison", "carne de ciervo"],
  ["shrimp", "langostino"],
  ["prawns", "langostinos"],
  ["scallops", "vieiras"],
  ["mussels", "mejillones"],
  ["fish fillet", "filet de pescado"],
  ["fish sticks", "bastones de pescado"],
  ["cold cuts", "fiambre"],
  ["deli meat", "fiambre"],
  ["turkey ham", "fiambre de pavo"],
  ["chicken drumstick", "pata muslo de pollo"],
  ["chicken leg", "pata muslo de pollo"],
  ["chicken tenderloin", "suprema de pollo"],
  ["chicken breast", "pechuga de pollo"],
  ["pork loin", "lomo de cerdo"],
  ["pork shoulder", "bondiola"],
  ["beef ribs", "asado"],
  ["short ribs", "asado"],
  ["beef brisket", "tapa de asado"],
  ["beef skirt", "entraña"],
  ["beef flank", "vacío"],
  ["beef rump", "colita de cuadril"],
  ["beef round", "bola de lomo"],
  ["beef chuck", "roast beef"],
  ["ground turkey", "carne picada de pavo"],
  ["ground pork", "carne picada de cerdo"],
  ["salami", "salame"],
  ["pepperoni", "salame picante"],
  ["prosciutto", "jamón crudo"],
  ["ham", "jamón cocido"],
];

export const ARGENTINE_OTHER_FOOD_VARIANTS: Array<[string, string]> = [
  ["yoghurt", "yogur"],
  ["yogurt", "yogur"],
  ["heavy cream", "crema de leche"],
  ["whipping cream", "crema de leche"],
  ["sour cream", "crema agria"],
  ["cream cheese", "queso crema"],
  ["cottage cheese", "ricota"],
  ["ricotta", "ricota"],
  ["mozzarella", "muzzarella"],
  ["corn starch", "maicena"],
  ["cornstarch", "maicena"],
  ["breadcrumbs", "pan rallado"],
  ["bread crumbs", "pan rallado"],
  ["crackers", "galletitas"],
  ["cookies", "galletitas"],
  ["peanut butter", "manteca de maní"],
  ["confectioners sugar", "azúcar impalpable"],
  ["powdered sugar", "azúcar impalpable"],
  ["brown sugar", "azúcar rubia"],
  ["corn flour", "harina de maíz"],
  ["wheat flour", "harina de trigo"],
  ["all purpose flour", "harina 000"],
  ["self rising flour", "harina leudante"],
  ["baking soda", "bicarbonato de sodio"],
  ["sparkling water", "agua con gas"],
  ["still water", "agua sin gas"],
  ["soft drink", "gaseosa"],
  ["soda pop", "gaseosa"],
  ["french fries", "papas fritas"],
  ["potato chips", "papas fritas"],
  ["oatmeal", "avena"],
  ["rolled oats", "avena arrollada"],
  ["sandwich bread", "pan lactal"],
  ["loaf bread", "pan lactal"],
  ["baguette", "pan francés"],
  ["bread roll", "miñón"],
  ["burger bun", "pan de hamburguesa"],
  ["pizza base", "prepizza"],
  ["pizza dough", "prepizza"],
  ["sweetener", "edulcorante"],
  ["corn flakes", "copos de maíz"],
  ["puffed rice", "arroz inflado"],
  ["granola bar", "barra de cereal"],
  ["candy", "caramelo"],
  ["lollipop", "chupetín"],
  ["cotton candy", "algodón de azúcar"],
  ["jelly", "gelatina"],
  ["gelatin dessert", "postre de gelatina"],
  ["corn syrup", "jarabe de maíz"],
  ["tomato sauce", "puré de tomate"],
  ["tomato paste", "extracto de tomate"],
  ["ketchup", "kétchup"],
  ["soy sauce", "salsa de soja"],
  ["hot sauce", "salsa picante"],
  ["mustard sauce", "mostaza"],
  ["cooking oil", "aceite de cocina"],
  ["olive oil", "aceite de oliva"],
  ["sunflower oil", "aceite de girasol"],
  ["canola oil", "aceite de canola"],
  ["corn oil", "aceite de maíz"],
  ["sunflower seeds", "semillas de girasol"],
  ["pumpkin seeds", "semillas de zapallo"],
  ["cashew nuts", "castañas de cajú"],
  ["peanuts", "maní"],
  ["peanut", "maní"],
  ["chickpeas", "garbanzos"],
  ["lentils", "lentejas"],
  ["quinoa", "quinoa"],
  ["couscous", "cuscús"],
  ["cornmeal", "polenta"],
  ["polenta flour", "harina de maíz"],
  ["pancake mix", "premezcla para panqueques"],
  ["pancakes", "panqueques"],
  ["waffles", "waffles"],
  ["muffin", "magdalena"],
  ["cupcake", "muffin"],
  ["pretzel", "pretzel"],
  ["popcorn snack", "pochoclo"],
];

const regionalFoodVariants: Array<[string, string]> = [
  ...ARGENTINE_VEGETABLE_VARIANTS,
  ...ARGENTINE_ANIMAL_PROTEIN_VARIANTS,
  ...ARGENTINE_OTHER_FOOD_VARIANTS,
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function regionalTermPattern(term: string): RegExp {
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(term)}(?=$|[^\\p{L}\\p{N}])`, "giu");
}

function simplifiedNutritionQuery(value: string): string {
  return value
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:kg|kgs|g|gr|gramos?|mg|l|lt|litros?|ml)\b/gi, " ")
    .replace(/\b(?:pack|packs|paquete|paquetes|caja|cajas|bolsa|bolsas|unidad|unidades)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function nutritionQueryVariants(query: string): string[] {
  const candidates = [query.trim(), simplifiedNutritionQuery(query)];
  for (const [from, to] of regionalFoodVariants) {
    if (regionalTermPattern(from).test(query)) {
      candidates.push(query.replace(regionalTermPattern(from), (_match, prefix: string) => `${prefix}${to}`));
    }
  }
  const unique: string[] = [];
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    const key = normalizeNutritionQuery(trimmed);
    if (trimmed && key && !unique.some((value) => normalizeNutritionQuery(value) === key)) unique.push(trimmed);
    if (unique.length >= 4) break;
  }
  return unique;
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
