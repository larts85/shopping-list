import { DataError, positive } from "./database";
import { isUnit, compatibleUnits, type Unit } from "./units";
export function purchaseValues(
  cantidad: unknown,
  medida: unknown,
  unit?: unknown,
) {
  if (unit !== undefined && !isUnit(unit))
    throw new DataError("Unidad inválida");
  return {
    cantidad: positive(cantidad),
    medida: positive(medida),
    unit: unit as Unit | undefined,
  };
}
export function requireCompatibleUnit(unit: Unit, productUnit: Unit) {
  if (!compatibleUnits(productUnit).includes(unit))
    throw new DataError("La unidad no corresponde al tipo de producto");
}
