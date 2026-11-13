import type { IList } from "./types";

type PurchasedItem = Pick<
  IList,
  "comprado" | "cantidad" | "precioValue" | "precioTotalValue" | "discountType" | "discountValue"
>;

function numericValue(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function getPurchasedTotal(
  items: ReadonlyArray<PurchasedItem>,
): { value: number; purchasedCount: number; pricedCount: number; missingCount: number };
export function getPurchasedTotal(
  items: ReadonlyArray<PurchasedItem>,
  listDiscount: { type: "percent" | "amount" | null; value: number | null },
): { value: number; purchasedCount: number; pricedCount: number; missingCount: number; subtotal: number; discount: number };
export function getPurchasedTotal(
  items: ReadonlyArray<PurchasedItem>,
  listDiscount?: { type: "percent" | "amount" | null; value: number | null },
) {
  let cents = 0;
  let purchasedCount = 0;
  let pricedCount = 0;
  for (const item of items) {
    if (item.comprado !== "1") continue;
    purchasedCount++;
    let total = numericValue(item.precioTotalValue);
    if (total === null) {
      const price = numericValue(item.precioValue);
      const quantity = numericValue(item.cantidad);
      if (price !== null && quantity !== null && quantity > 0) {
        total = price * quantity;
      }
    }
    if (total === null || !Number.isFinite(total)) continue;
    // Sum each displayed line in cents, preserving explicit totals and zeroes.
    const itemDiscount = numericValue(item.discountValue) ?? 0;
    const discounted = item.discountType === "percent"
      ? total * (1 - Math.min(itemDiscount, 100) / 100)
      : total - Math.min(total, item.discountType === "amount" ? itemDiscount : 0);
    cents += Math.round((discounted + Number.EPSILON) * 100);
    pricedCount++;
  }
  const subtotal = cents / 100;
  const listValue = numericValue(listDiscount?.value) ?? 0;
  const listReduction = listDiscount?.type === "percent"
    ? subtotal * Math.min(listValue, 100) / 100
    : listDiscount?.type === "amount" ? Math.min(subtotal, listValue) : 0;
  const result = {
    value: Math.max(0, Math.round((subtotal - listReduction + Number.EPSILON) * 100) / 100),
    purchasedCount,
    pricedCount,
    missingCount: purchasedCount - pricedCount,
  };
  return listDiscount === undefined
    ? result
    : { ...result, subtotal, discount: Math.min(subtotal, listReduction) };
}
