import type { Category, Product } from "./types";
import { type Unit, isUnit } from "./units";
import { suggestProductUnit } from "./productUnits";

export interface ParsedItem {
  raw: string;
  name: string;
  quantity: number;
}

export interface ClassifiedItem extends ParsedItem {
  categoryId: string;
  categoryName: string;
  unit: Unit;
  selected: boolean;
}

/**
 * Normalizes text for accent-insensitive and casing-insensitive comparison.
 */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Parses raw pasted text into individual items:
 * - Splits by newlines.
 * - Strips leading enumerations: numbers with dashes/dots/parens (e.g. "1-", "2. ", "10)"),
 *   bullets ("-", "*", "•", "–", "—", "+"), and leading/trailing whitespace.
 * - Detects and extracts leading quantities if present (e.g. "2 Jgos sábanas", "2 Almohadones").
 */
export function parseRawItemList(text: string): ParsedItem[] {
  const lines = text.split(/\r?\n+/);
  const items: ParsedItem[] = [];

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    // 1. Strip enumeration prefixes (numbers with punctuation, bullets, etc.)
    // Examples: "1-Control", "2- Extensión", "10-Soga", "1. Leche", "1) Pan", "- Yerba", "• Azúcar"
    line = line.replace(/^[\s*•–—+]*\d+\s*[-.):–—]+\s*/, "");
    line = line.replace(/^[\s*•–—+-]+\s*/, "");
    line = line.trim();
    if (!line) continue;

    // 2. Extract leading quantity if present (e.g. "2 Jgos sábanas...", "3 x Pan", "2 Almohadones...")
    let quantity = 1;
    let name = line;

    // Matches numbers at start followed by unit/multiplier or space and item name
    // (e.g. "2 Jgos...", "1.5 kg...", "3 x ...")
    const qtyMatch = line.match(/^(\d+(?:[.,]\d+)?)\s*(?:x|de|\b)\s+(.+)$/i);
    if (qtyMatch && qtyMatch[1] && qtyMatch[2]) {
      const parsedQty = parseFloat(qtyMatch[1].replace(",", "."));
      if (parsedQty > 0 && Number.isFinite(parsedQty)) {
        quantity = parsedQty;
        name = qtyMatch[2].trim();
      }
    }

    // Capitalize first letter of product name for clean display
    if (name.length > 0) {
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }

    items.push({
      raw: rawLine.trim(),
      name,
      quantity: quantity,
    });
  }

  return items;
}

interface CategoryRule {
  target: string;
  patterns: RegExp[];
}

const CATEGORY_RULES: CategoryRule[] = [
  // 1. Limpieza (before Hogar so "detergente para vajilla" -> Limpieza, not Hogar)
  {
    target: "limpieza",
    patterns: [
      /\bcubo\w*/,
      /\bbalde\w*/,
      /\btrapo\w*/,
      /\bfranela\w*/,
      /\brejilla\w*/,
      /\blavandina\w*/,
      /\bdetergente\w*/,
      /\bjabon (en polvo|para ropa|liquido)\w*/,
      /\bsuavizante\w*/,
      /\bdesinfectante\w*/,
      /\bmopa\w*/,
      /\blampazo\w*/,
      /\bescoba\w*/,
      /\bescobillon\w*/,
      /\bsecador\w*/,
      /\bbolsas? (de )?residu/,
      /\besponja\w*/,
      /\bvirulana\w*/,
      /\blustra\w*/,
      /\bdesodorante de ambiente\w*/,
    ],
  },
  // 2. Aseo / Higiene personal (before Hogar to avoid "jabón de tocador" -> Hogar via toall*)
  {
    target: "aseo",
    patterns: [
      /\bshampoo\w*/,
      /\bchampu\w*/,
      /\bacondicionador\w*/,
      /\bdesodorante\w*/,
      /\bdentifrico\w*/,
      /\bpasta dental\w*/,
      /\bcepillo de dientes\w*/,
      /\bafeitad\w*/,
      /\btoalla.*higien/i,
      /\btampon\w*/,
      /\balgodon\w*/,
      /\bpreservativ\w*/,
      /\bjabon de tocador\w*/,
      /\bpapel higienico\w*/,
      /\bpanuelos?\w*/,
    ],
  },
  // 3. Bebés
  {
    target: "bebes",
    patterns: [
      /\bpanales?\w*/,
      /\btoallitas humedas\w*/,
      /\bmamadera\w*/,
      /\bchupete\w*/,
      /\boleo calcareo\w*/,
    ],
  },
  // 4. Kitchen tools, textiles, furniture, household goods -> Hogar
  // After Limpieza/Aseo so "detergente para vajilla" maps to Limpieza not Hogar
  {
    target: "hogar",
    patterns: [
      /\b(machacador|abridor|sacacorcho|exprimidor|pelador|rallador|escurridor|colador|embudo|cuchara|cuchillo|tenedor|cubierto|vajilla|olla|sarten|cacerola|fuente|asader|jarro|jarra|taza|vaso|bowl|repasador)\w*/,
      /\b(cortina|mantel|sabana|almohad|gavet|mueble|cajoner|soga|tender|tendedero|percha|canasto|ropero|colcha|frazada|toalla|toallon|control|velador|adorno|espejo|cuadro)\w*/,
    ],
  },
  // 5. Dietética / Farmacia
  {
    target: "dietetica",
    patterns: [
      /\bpastill\w*/,
      /\bmedicam\w*/,
      /\bvitamin\w*/,
      /\bsuplement\w*/,
      /\bfrutos secos\b/,
      /\balmendra\w*/,
      /\bnuez\w*/,
      /\bnueces\w*/,
      /\bchia\w*/,
      /\bgranola\w*/,
      /\bsin tacc\b/,
      /\btofu\w*/,
      /\bavena\w*/,
    ],
  },
  // 6. Ferretería / Electricidad
  {
    target: "ferreteria",
    patterns: [
      /\bextension\w*/,
      /\bcable\w*/,
      /\benchufe\w*/,
      /\bzapatilla\w*/,
      /\bficha\w*/,
      /\bherramienta\w*/,
      /\bdestornillador\w*/,
      /\btornillo\w*/,
      /\btuerca\w*/,
      /\bclavo\w*/,
      /\bmartillo\w*/,
      /\blija\w*/,
      /\bpila\w*/,
      /\bbalasto\w*/,
      /\bfoco\w*/,
      /\blampara\w*/,
      /\bcinta aisladora\b/,
      /\btaladro\w*/,
      /\bpinza\w*/,
      /\balicate\w*/,
      /\bpega(mento|todo)\w*/,
    ],
  },

  // 7. Impresión 3D
  {
    target: "impresion 3d",
    patterns: [
      /\bfilamento\w*/,
      /\bpla\b/,
      /\babs\b/,
      /\bpetg\b/,
      /\bresina\w*/,
      /\bnozzle\w*/,
      /\bboquilla\w*/,
    ],
  },
  // 8. Bebidas
  {
    target: "bebidas",
    patterns: [
      /\bagua\w*/,
      /\bsoda\w*/,
      /\bgaseosa\w*/,
      /\bcoca(\s*cola)?\w*/,
      /\bpepsi\w*/,
      /\bsprite\w*/,
      /\bfanta\w*/,
      /\bjugo\w*/,
      /\bvino\w*/,
      /\bcerveza\w*/,
      /\bfernet\w*/,
      /\baperitivo\w*/,
      /\bchampagne\w*/,
      /\bsidra\w*/,
    ],
  },
  // 9. Congelados
  {
    target: "congelados",
    patterns: [
      /\bhelado\w*/,
      /\bcongelad\w*/,
      /\bhamburguesa\w*/,
      /\bpatitas\w*/,
      /\bmedallon\w*/,
    ],
  },
  // 10. Pescadería
  {
    target: "pescaderia",
    patterns: [
      /\bpescado\w*/,
      /\bmerluza\w*/,
      /\bsalmon\w*/,
      /\batun fresco\w*/,
      /\bcalamar\w*/,
      /\brabas\w*/,
      /\blangostino\w*/,
      /\bcamaron\w*/,
      /\bmejillon\w*/,
    ],
  },
  // 11. Cárnicos
  {
    target: "carnicos",
    patterns: [
      /\bcarne\w*/,
      /\bpollo\w*/,
      /\basado\w*/,
      /\bbife\w*/,
      /\bmilanesa\w*/,
      /\bcerdo\w*/,
      /\bchorizo\w*/,
      /\bmorcilla\w*/,
      /\bpechuga\w*/,
      /\bcostilla\w*/,
      /\bbondiola\w*/,
      /\bvacio\w*/,
      /\bentraña\w*/,
      /\bmatambre\w*/,
      /\blomo\w*/,
      /\bpeceto\w*/,
      /\bosobuco\w*/,
    ],
  },
  // 12. Fiambrería
  {
    target: "fiambreria",
    patterns: [
      /\bjamon\w*/,
      /\bsalame\w*/,
      /\bsalchichon\w*/,
      /\bmortadela\w*/,
      /\bpanceta\w*/,
      /\blomito\w*/,
    ],
  },
  // 13. Panadería (before Lácteos so "medialunas de manteca" -> Panadería, not Lácteos)
  {
    target: "panaderia",
    patterns: [
      /\bpan\w*/,
      /\bfactura\w*/,
      /\bmedialuna\w*/,
      /\bbizcoch\w*/,
      /\bgalletit\w*/,
      /\btostada\w*/,
      /\bprepizza\w*/,
    ],
  },
  // 14. Lácteos
  {
    target: "lacteos",
    patterns: [
      /\bleche\w*/,
      /\byogur\w*/,
      /\bqueso\w*/,
      /\bmanteca\w*/,
      /\bcrema de leche\w*/,
      /\bdulce de leche\w*/,
      /\bricota\w*/,
    ],
  },
  // 15. Verdulería
  {
    target: "verduleria",
    patterns: [
      /\btomate\w*/,
      /\blechuga\w*/,
      /\bcebolla\w*/,
      /\bpapa\w*/,
      /\bpapas\w*/,
      /\bzanahoria\w*/,
      /\bmanzana\w*/,
      /\bbanana\w*/,
      /\blimon\w*/,
      /\bpera\w*/,
      /\bnaranja\w*/,
      /\bajo\w*/,
      /\bajos\w*/,
      /\bjengibre\w*/,
      /\bfruta\w*/,
      /\bverdura\w*/,
      /\bpalta\w*/,
      /\bespinaca\w*/,
      /\bacelga\w*/,
      /\bcalabaza\w*/,
      /\bzapallo\w*/,
      /\bfrutilla\w*/,
      /\buva\w*/,
      /\bsandia\w*/,
      /\bmelon\w*/,
    ],
  },
  // 16. Almacén
  {
    target: "almacen",
    patterns: [
      /\barroz\w*/,
      /\bfideo\w*/,
      /\baceite\w*/,
      /\bazucar\w*/,
      /\bsal\b/,
      /\bharina\w*/,
      /\byerba\w*/,
      /\bcafe\w*/,
      /\bte\b/,
      /\blegumbre\w*/,
      /\blenteja\w*/,
      /\bconserva\w*/,
      /\blata\w*/,
      /\bpure de tomate\w*/,
      /\bmayonesa\w*/,
      /\bmostaza\w*/,
    ],
  },
];

/**
 * Classifies an individual product name into a category and suggested unit:
 * 1. Checks for match against existing catalog products.
 * 2. Matches against category keyword rules.
 * 3. Falls back to "Almacén" or "Hogar" or the first available category.
 */
export function classifyItem(
  name: string,
  categories: Category[],
  catalogProducts?: Product[],
): { categoryId: string; categoryName: string; unit: Unit } {
  const normName = normalizeText(name);

  // 1. Exact or close match with catalog products
  if (catalogProducts && catalogProducts.length > 0) {
    const foundProduct = catalogProducts.find(
      (p) => normalizeText(p.name) === normName,
    );
    if (foundProduct) {
      const cat = categories.find((c) => c.id === foundProduct.id_category);
      if (cat) {
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          unit: foundProduct.unit ?? suggestProductUnit(name, cat.name),
        };
      }
    }
  }

  // 2. Rule-based keyword matching
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((p) => p.test(normName))) {
      const match = categories.find(
        (c) =>
          normalizeText(c.name).includes(rule.target) ||
          rule.target.includes(normalizeText(c.name)),
      );
      if (match) {
        return {
          categoryId: match.id,
          categoryName: match.name,
          unit: suggestProductUnit(name, match.name),
        };
      }
    }
  }

  // 3. Fallback: match "Almacén" or "Hogar" or first available
  const defaultCategory =
    categories.find((c) => normalizeText(c.name) === "almacen") ||
    categories.find((c) => normalizeText(c.name) === "hogar") ||
    categories[0];

  const categoryId = defaultCategory?.id || "";
  const categoryName = defaultCategory?.name || "";
  const unit = suggestProductUnit(name, categoryName);

  return { categoryId, categoryName, unit: isUnit(unit) ? unit : "un" };
}

/**
 * Parses and classifies an entire text list into interactive review items.
 */
export function parseAndClassifyList(
  text: string,
  categories: Category[],
  catalogProducts?: Product[],
): ClassifiedItem[] {
  const parsed = parseRawItemList(text);

  return parsed.map((item) => {
    const classification = classifyItem(item.name, categories, catalogProducts);
    return {
      ...item,
      categoryId: classification.categoryId,
      categoryName: classification.categoryName,
      unit: classification.unit,
      selected: true,
    };
  });
}
