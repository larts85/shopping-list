export type NutritionNutrientKind =
  | "Macronutriente"
  | "Vitamina"
  | "Mineral"
  | "Compuesto bioactivo";

export type NutritionNutrient = {
  name: string;
  kind: NutritionNutrientKind;
  note: string;
};

export type NutritionProfile = {
  label: string;
  matches: string[];
  categories?: string[];
  nutrients: NutritionNutrient[];
};

export const NUTRITION_DATA_NOTICE =
  "Perfil orientativo de alimentos genéricos; la variedad, marca, porción y cocción pueden cambiar la composición. No reemplaza una etiqueta ni una indicación profesional.";

const profiles: NutritionProfile[] = [
  {
    label: "Tomate",
    matches: ["tomate"],
    nutrients: [
      { name: "Fibra", kind: "Macronutriente", note: "Aporta fibra dietaria" },
      { name: "Vitamina C", kind: "Vitamina", note: "Antioxidante" },
      { name: "Provitamina A", kind: "Vitamina", note: "Carotenoides" },
      { name: "Vitamina K", kind: "Vitamina", note: "Presente en el alimento" },
      { name: "Potasio", kind: "Mineral", note: "Mineral predominante" },
      { name: "Licopeno", kind: "Compuesto bioactivo", note: "Carotenoide" },
    ],
  },
  {
    label: "Hojas verdes",
    matches: ["lechuga", "espinaca", "acelga"],
    nutrients: [
      { name: "Fibra", kind: "Macronutriente", note: "Aporta fibra dietaria" },
      { name: "Folato (B9)", kind: "Vitamina", note: "Vitamina del grupo B" },
      { name: "Provitamina A", kind: "Vitamina", note: "Carotenoides" },
      { name: "Vitamina K", kind: "Vitamina", note: "Presente en hojas verdes" },
      { name: "Potasio", kind: "Mineral", note: "Mineral predominante" },
      { name: "Magnesio", kind: "Mineral", note: "Presente en pequeñas cantidades" },
    ],
  },
  {
    label: "Frutas frescas",
    matches: [
      "uva", "manzana", "mandarina", "arandano", "banana", "pera", "naranja",
      "pina", "durazno", "ciruela", "frutilla", "melon", "sandia",
    ],
    categories: ["verduleria"],
    nutrients: [
      { name: "Carbohidratos", kind: "Macronutriente", note: "Principalmente azúcares naturales" },
      { name: "Fibra", kind: "Macronutriente", note: "Aporta fibra dietaria" },
      { name: "Vitamina C", kind: "Vitamina", note: "Variable según la fruta" },
      { name: "Provitamina A", kind: "Vitamina", note: "Más relevante en frutas anaranjadas" },
      { name: "Vitamina K", kind: "Vitamina", note: "Presente en algunas frutas" },
      { name: "Potasio", kind: "Mineral", note: "Mineral habitual en frutas" },
      { name: "Polifenoles", kind: "Compuesto bioactivo", note: "Perfil variable por especie y color" },
    ],
  },
  {
    label: "Zanahoria y raíces",
    matches: ["zanahoria", "batata", "remolacha"],
    nutrients: [
      { name: "Carbohidratos", kind: "Macronutriente", note: "Aporte energético variable" },
      { name: "Fibra", kind: "Macronutriente", note: "Aporta fibra dietaria" },
      { name: "Provitamina A", kind: "Vitamina", note: "Carotenoides" },
      { name: "Vitamina K", kind: "Vitamina", note: "Presente en el alimento" },
      { name: "Vitamina B6", kind: "Vitamina", note: "Presente en pequeñas cantidades" },
      { name: "Potasio", kind: "Mineral", note: "Mineral predominante" },
    ],
  },
  {
    label: "Morrón y vegetales coloridos",
    matches: ["morron", "pimiento", "brocoli", "zapallito"],
    nutrients: [
      { name: "Fibra", kind: "Macronutriente", note: "Aporta fibra dietaria" },
      { name: "Vitamina C", kind: "Vitamina", note: "Suele ser relevante en morrones" },
      { name: "Provitamina A", kind: "Vitamina", note: "Depende del color" },
      { name: "Vitamina B6", kind: "Vitamina", note: "Presente en el alimento" },
      { name: "Vitamina K", kind: "Vitamina", note: "Presente en vegetales verdes" },
      { name: "Potasio", kind: "Mineral", note: "Mineral predominante" },
    ],
  },
  {
    label: "Carnes y aves",
    matches: [],
    categories: ["carnicos", "fiambreria"],
    nutrients: [
      { name: "Proteínas", kind: "Macronutriente", note: "Proteína completa" },
      { name: "Hierro", kind: "Mineral", note: "Más relevante en carnes rojas" },
      { name: "Zinc", kind: "Mineral", note: "Mineral habitual" },
      { name: "Selenio", kind: "Mineral", note: "Mineral habitual" },
      { name: "Vitamina B12", kind: "Vitamina", note: "Característica de alimentos animales" },
    ],
  },
  {
    label: "Pescados",
    matches: [],
    categories: ["pescaderia"],
    nutrients: [
      { name: "Proteínas", kind: "Macronutriente", note: "Proteína completa" },
      { name: "Omega-3", kind: "Macronutriente", note: "Más relevante en pescados grasos" },
      { name: "Vitamina B12", kind: "Vitamina", note: "Presente en alimentos animales" },
      { name: "Vitamina D", kind: "Vitamina", note: "Variable según especie" },
      { name: "Selenio", kind: "Mineral", note: "Mineral habitual" },
      { name: "Yodo", kind: "Mineral", note: "Variable según especie" },
    ],
  },
  {
    label: "Lácteos",
    matches: ["leche", "queso", "yogur", "yogurt", "crema", "manteca"],
    categories: ["lacteos"],
    nutrients: [
      { name: "Proteínas", kind: "Macronutriente", note: "Aporte variable por producto" },
      { name: "Calcio", kind: "Mineral", note: "Mineral característico" },
      { name: "Fósforo", kind: "Mineral", note: "Mineral habitual" },
      { name: "Vitamina B12", kind: "Vitamina", note: "Presente en lácteos" },
      { name: "Vitamina D", kind: "Vitamina", note: "Depende de fortificación" },
    ],
  },
  {
    label: "Legumbres y frutos secos",
    matches: ["poroto", "lenteja", "garbanzo", "mani", "almendra", "nuez", "castana", "semilla"],
    categories: ["dietetica"],
    nutrients: [
      { name: "Proteínas", kind: "Macronutriente", note: "Aporte relevante en legumbres y frutos secos" },
      { name: "Fibra", kind: "Macronutriente", note: "Aporta fibra dietaria" },
      { name: "Grasas insaturadas", kind: "Macronutriente", note: "Más relevantes en frutos secos y semillas" },
      { name: "Magnesio", kind: "Mineral", note: "Mineral habitual" },
      { name: "Hierro", kind: "Mineral", note: "Más relevante en legumbres" },
      { name: "Zinc", kind: "Mineral", note: "Mineral habitual" },
      { name: "Folato (B9)", kind: "Vitamina", note: "Más relevante en legumbres" },
    ],
  },
  {
    label: "Cereales y panificados",
    matches: ["arroz", "avena", "fideo", "pasta", "pan", "harina", "cereal", "galleta", "maiz", "papa"],
    categories: ["almacen", "panaderia"],
    nutrients: [
      { name: "Carbohidratos", kind: "Macronutriente", note: "Principal fuente energética del grupo" },
      { name: "Fibra", kind: "Macronutriente", note: "Mayor en integrales y avena" },
      { name: "Proteínas", kind: "Macronutriente", note: "Aporte complementario" },
      { name: "Hierro", kind: "Mineral", note: "Variable y dependiente de fortificación" },
      { name: "Magnesio", kind: "Mineral", note: "Más relevante en integrales" },
      { name: "Vitaminas B", kind: "Vitamina", note: "Variable según cereal y fortificación" },
    ],
  },
];

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function getNutritionProfile(
  name: string,
  categoryName: string,
): NutritionProfile | null {
  const normalizedName = normalize(name);
  const normalizedCategory = normalize(categoryName);
  return (
    profiles.find(
      (profile) =>
        profile.matches.some((match) => normalizedName.includes(normalize(match))) &&
        (!profile.categories || profile.categories.some((category) => normalizedCategory.includes(normalize(category)))),
    ) ??
    profiles.find(
      (profile) =>
        profile.categories?.some((category) => normalizedCategory.includes(normalize(category))) &&
        profile.matches.length === 0,
    ) ??
    null
  );
}
