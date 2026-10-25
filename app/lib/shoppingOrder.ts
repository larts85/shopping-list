/** Keep the source order within each purchase state without mutating list data. */
export function getOrderedShoppingGroups<
  Category extends { id: string },
  Item extends { comprado: string },
>(categories: readonly Category[], list: Record<string, readonly Item[]>) {
  return categories
    .map((category) => {
      const products = list[category.id] ?? [];
      return {
        category,
        products: [...products].sort(
          (a, b) => Number(a.comprado === "1") - Number(b.comprado === "1"),
        ),
        completed:
          products.length > 0 && products.every((p) => p.comprado === "1"),
      };
    })
    .filter(({ products }) => products.length > 0)
    .sort((a, b) => Number(a.completed) - Number(b.completed));
}
