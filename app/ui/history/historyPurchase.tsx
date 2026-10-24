"use client";

import { isUnit } from "@/app/lib/units";
import { purchaseDate } from "@/app/lib/purchaseHistory";
import ActionMenu from "@/shared/components/ui/ActionMenu";
import { RiBarChartBoxLine, RiShoppingCartLine } from "react-icons/ri";
import { formatCurrency, groupTotal } from "./historyStats";
import type { HistoryItem } from "./historyTypes";

function displayTotal(items: HistoryItem[]) {
  const total = groupTotal(items);
  if (!total.pricedItems) return "Sin precios";
  return `${total.complete ? "" : "≈ "}${formatCurrency(total.value)}`;
}

export default function HistoryPurchase({
  items,
  busy,
  repeatBusy,
  onRepeat,
  onStats,
  onEdit,
}: {
  items: HistoryItem[];
  busy: boolean;
  repeatBusy: boolean;
  onRepeat: () => void;
  onStats: () => void;
  onEdit: (item: HistoryItem) => void;
}) {
  const first = items[0];
  const purchase = first.purchase;
  const title = String(purchase.purchase_name ?? purchaseDate(first));
  const total = groupTotal(items);

  return (
    <section className="panel">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-semibold">{title}</h2>
          <div className="mt-2 space-y-1 text-sm text-zinc-500">
            <p>Lista: {first.listName}</p>
            <p>
              {new Intl.DateTimeFormat("es-AR", {
                dateStyle: "long",
                timeStyle: "medium",
                timeZone: "America/Argentina/Buenos_Aires",
              }).format(new Date(first.purchasedAt))}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:max-w-[28rem]">
          <div
            className="mr-1 text-right"
            title={total.complete ? undefined : "Faltan precios de algunos artículos"}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Total de la compra
            </p>
            <p className="text-lg font-semibold tabular-nums">{displayTotal(items)}</p>
          </div>
          <button
            type="button"
            className="icon-button border border-zinc-200"
            aria-label={`Ver estadísticas de ${title}`}
            title="Ver estadísticas"
            onClick={onStats}
          >
            <RiBarChartBoxLine aria-hidden="true" size={21} />
          </button>
          <button
            type="button"
            className="btn-secondary hidden items-center gap-2 md:inline-flex"
            disabled={busy || repeatBusy}
            onClick={onRepeat}
          >
            <RiShoppingCartLine aria-hidden="true" size={18} />
            Volver a comprar
          </button>
          <ActionMenu
            label="Acciones de la compra"
            items={[
              {
                label: "Ver estadísticas",
                icon: RiBarChartBoxLine,
                onSelect: onStats,
              },
              {
                label: "Volver a comprar",
                icon: RiShoppingCartLine,
                disabled: busy || repeatBusy,
                onSelect: onRepeat,
              },
            ]}
          />
        </div>
      </div>
      <ul className="mt-5 divide-y divide-zinc-100">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap justify-between gap-3 py-3">
            <div>
              <p className="font-medium">{String(item.purchase.name ?? "Producto")}</p>
              {typeof item.purchase.description === "string" &&
                item.purchase.description.trim() && (
                  <p className="text-sm text-zinc-500">{item.purchase.description}</p>
                )}
              <p className="text-sm text-zinc-500">
                {String(item.purchase.cantidad ?? "—")} {isUnit(item.purchase.unit) ? item.purchase.unit : "un"}
                {!isUnit(item.purchase.unit) && item.purchase.medida && Number(item.purchase.medida) !== 1
                  ? ` · medida anterior: ${item.purchase.medida}`
                  : ""}
                {" · "}
                {item.purchase.precio == null
                  ? "Sin precio"
                  : `${formatCurrency(Number(item.purchase.precio))} por ${isUnit(item.purchase.unit) ? item.purchase.unit : "unidad"}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-semibold tabular-nums">
                {item.purchase.precio_total == null
                  ? "—"
                  : formatCurrency(Number(item.purchase.precio_total))}
              </p>
              {item.canEdit && (
                <button type="button" className="btn-secondary" onClick={() => onEdit(item)}>
                  Editar
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

HistoryPurchase.displayName = "HistoryPurchase";
