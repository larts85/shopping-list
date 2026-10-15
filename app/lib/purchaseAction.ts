export function getPurchaseActionLabel(
  products: ReadonlyArray<{ comprado: string }>,
) {
  return products.length > 0 && products.every((product) => product.comprado === "1")
    ? "Finalizar compra"
    : "Finalizar compra parcial";
}
