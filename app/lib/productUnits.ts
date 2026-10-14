import type { Unit } from "./units";

export function normalizeProductName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Suggest the selling unit, never infer it from an object's size or capacity.
// A 500 g packet, 473 ml can, 1 kg spool or 2.5 l jug is still one item.
export function suggestProductUnit(name: string, category = ""): Unit {
  const product = normalizeProductName(name);
  const group = normalizeProductName(category);
  if (
    group === "farmacia" &&
    /\b(comprimidos?|comp|tabletas?|pastillas?|capsulas?|pildoras?|paracetamol|ibuprofeno)\b/.test(
      product,
    )
  )
    return "comp";
  if (
    /\b(paquete|pack|pote|botella|lata|sobre|caja|rollo|bobina|frasco|bolsa|bidon)\b/.test(
      product,
    ) ||
    /\b\d+(?: [0-9]+)?\s*(kg|g|gr|grs|gramos|ml|cc|l|lt|lts|litros|u|unidades)\b/.test(
      product,
    )
  )
    return "un";
  if (
    /^(bananas?|platanos?|manzanas?|peras?|uvas?|tomate|limon|jengibre|carne|cerdo|pollo|carnaza|chuleta|carre|osobuco|chorizo|morcilla|merluza|queso sardo|queso mar del plata|salchichon|paleta de cerdo|jamon cocido|queso barra)( |$)/.test(
      product,
    )
  )
    return "kg";
  if (
    /^(agua|vino|cerveza|jugo|leche|vinagre|aceite|lavandina|detergente|suavizante)( |$)/.test(
      product,
    ) &&
    !/\b(polvo|condensada|fermentada|barra|solido)\b/.test(product)
  )
    return "lt";
  if (product === "crema de leche" || product === "oleo calcareo") return "ml";
  if (
    /^(almendras|nueces|castanas de caju|mani|pasas de uva|ciruelas secas|cacao amargo)( |$)/.test(
      product,
    )
  )
    return "g";
  if (["verduleria", "carnicos", "carniceria", "pescaderia"].includes(group))
    return "kg";
  return "un";
}
