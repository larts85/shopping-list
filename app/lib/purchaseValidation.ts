import { DataError, positive } from "./database";
import { isQuantityValidForUnit, isUnit, type Unit } from "./units";
export function quantityForUnit(value: unknown, unit?: Unit): number {
  const quantity = positive(value);
  if (unit && !isQuantityValidForUnit(quantity, unit))
    throw new DataError(
      "La cantidad debe ser un número entero para esta unidad",
    );
  return quantity;
}
export function purchaseValues(
  cantidad: unknown,
  medida: unknown,
  unit?: unknown,
) {
  if (unit !== undefined && !isUnit(unit))
    throw new DataError("Unidad inválida");
  return {
    cantidad: quantityForUnit(cantidad, unit as Unit | undefined),
    medida: positive(medida),
    unit: unit as Unit | undefined,
  };
}
export function requireAvailableUnit(unit: Unit, availableUnits: Unit[]) {
  if (!availableUnits.includes(unit))
    throw new DataError("La unidad no está habilitada para este producto");
}
