export const units = ["un", "kg", "g", "lt", "ml"] as const;
export type Unit = (typeof units)[number];
export const unitLabels: Record<Unit, string> = {
  un: "Unidades",
  kg: "Kilogramos",
  g: "Gramos",
  lt: "Litros",
  ml: "Mililitros",
};
export const unitAbbreviations: Record<Unit, string> = {
  un: "un",
  kg: "kg",
  g: "gr",
  lt: "lt",
  ml: "ml",
};
export function isUnit(value: unknown): value is Unit {
  return typeof value === "string" && units.includes(value as Unit);
}
export function compatibleUnits(unit: Unit): Unit[] {
  if (unit === "kg" || unit === "g") return ["kg", "g"];
  if (unit === "lt" || unit === "ml") return ["lt", "ml"];
  return ["un"];
}

export function isValidAvailableUnits(
  value: unknown,
  baseUnit: Unit,
): value is Unit[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > units.length)
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
