import { DataError, positive } from "./database";
import { isUnit, type Unit } from "./units";
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
export function requireAvailableUnit(unit: Unit, availableUnits: Unit[]) {
  if (!availableUnits.includes(unit))
    throw new DataError("La unidad no está habilitada para este producto");
}
