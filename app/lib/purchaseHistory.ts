export type PurchaseHistoryRecord = {
  purchase: Record<string, string | number | null>;
  purchasedAt: string;
};

export function purchaseDate(item: PurchaseHistoryRecord): string {
  const legacy = item.purchase.fecha;
  const serial =
    typeof legacy === "number"
      ? legacy
      : typeof legacy === "string" && /^\d+(\.\d+)?$/.test(legacy)
        ? Number(legacy)
        : null;
  if (serial !== null && serial > 0 && serial < 100000) {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000));
  }
  if (legacy) return String(legacy);
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(item.purchasedAt));
}

export function purchaseHistoryGroupKey(item: PurchaseHistoryRecord): string {
  const purchaseId = item.purchase.purchase_id;
  return typeof purchaseId === "string"
    ? `purchase:${purchaseId}`
    : `legacy:${purchaseDate(item)}`;
}
