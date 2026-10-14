export const units = ["un", "kg", "g", "mg", "comp", "lt", "ml"] as const;
export type Unit = (typeof units)[number];
export const unitLabels: Record<Unit, string> = {
  un: "Unidades",
  kg: "Kilogramos",
  g: "Gramos",
  mg: "Miligramos",
  comp: "Comprimidos",
  lt: "Litros",
  ml: "Mililitros",
};
export const unitAbbreviations: Record<Unit, string> = {
  un: "un",
  kg: "kg",
  g: "gr",
  mg: "mg",
  comp: "comp",
  lt: "lt",
  ml: "ml",
};
export function isUnit(value: unknown): value is Unit {
  return typeof value === "string" && units.includes(value as Unit);
}
export function compatibleUnits(unit: Unit): Unit[] {
  if (unit === "comp") return ["comp"];
  if (unit === "kg" || unit === "g" || unit === "mg")
    return ["kg", "g", "mg"];
  if (unit === "lt" || unit === "ml") return ["lt", "ml"];
  return ["un"];
}

function normalizeCategoryName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function unitsForCategory(categoryName = ""): Unit[] {
  return units.filter(
    (unit) => unit !== "comp" || normalizeCategoryName(categoryName) === "farmacia",
  );
}

export function isUnitAllowedForCategory(
  unit: Unit,
  categoryName: string,
): boolean {
  return unitsForCategory(categoryName).includes(unit);
}

export function isValidAvailableUnits(
  value: unknown,
  baseUnit: Unit,
): value is Unit[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 5)
    return false;
  if (
    value.some((item) => !isUnit(item)) ||
    new Set(value).size !== value.length
  )
    return false;
  const selected = value as Unit[];
  if (!selected.includes(baseUnit))
    return false;
  return true;
}
