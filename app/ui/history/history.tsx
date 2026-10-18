"use client";
import { setActiveListId } from "@/app/lib/listClient";
import { useEffect, useRef, useState } from "react";
import { isUnit } from "@/app/lib/units";
import { useRouter } from "next/navigation";
import { repeatPurchase } from "@/app/actions/historical";
import EditHistoricalItemModal from "./editHistoricalItemModal";
import {
  purchaseDate,
  purchaseHistoryGroupKey,
  type PurchaseHistoryRecord,
} from "@/app/lib/purchaseHistory";
import ActionMenu from "@/shared/components/ui/ActionMenu";
import { RiShoppingCartLine } from "react-icons/ri";
type Item = PurchaseHistoryRecord & {
  id: string;
  listId: string;
  listName: string;
  canEdit: boolean;
};
const currency = (value: string | number | null | undefined) => {
  if (value == null || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(number)
    : String(value);
};
export default function History() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(0);
  const [retryPage, setRetryPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(true);
  const [repeatBusy, setRepeatBusy] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);
  async function load(next: number) {
    const version = ++requestVersion.current;
    setRetryPage(next);
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/historical/get-historical?page=${next}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("No se pudo cargar el historial.");
      const data = await response.json();
      if (version !== requestVersion.current) return;
      setItems((prev) => (next === 0 ? data.items : [...prev, ...data.items]));
      setHasMore(data.hasMore);
      setPage(next);
    } catch {
      if (version === requestVersion.current)
        setError("No se pudo cargar el historial. Intenta nuevamente.");
    } finally {
      if (version === requestVersion.current) setBusy(false);
    }
  }
  useEffect(() => {
    void load(0);
    return () => {
      requestVersion.current++;
    };
  }, []);
  async function repeat(groupKey: string, purchases: Item[]) {
    if (repeatBusy) return;
    setRepeatBusy(groupKey);
    setError("");
    try {
      const created = await repeatPurchase(
        groupKey,
        purchases.map((item) => item.id),
        purchases[0].listId,
      );
      setActiveListId(created.id);
      router.push(`/lists/${created.slug}`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo volver a crear la lista de compra.",
      );
    } finally {
      setRepeatBusy("");
    }
  }
  const groups = items.reduce(
    (acc, item) => {
      const key = `${item.listId}:${purchaseHistoryGroupKey(item)}`;
      (acc[key] ||= []).push(item);
      return acc;
    },
    {} as Record<string, Item[]>,
  );
  return (
    <div className="page-shell space-y-6">
      <h1 className="text-2xl font-semibold">Historial de compras</h1>
      <p className="text-sm text-zinc-500">
        Compras finalizadas de tus listas compartidas, incluidas las importadas.
      </p>
      {error && (
        <div role="alert" className="error-notice">
          {error}
          <button
            className="btn-secondary ml-3"
            disabled={busy}
            onClick={() => void load(retryPage)}
          >
            Reintentar
          </button>
        </div>
      )}
      {!busy && !error && !items.length && (
        <div className="empty-state">
          Todavía no hay compras finalizadas. Marca productos como comprados y
          pulsa Finalizar compra parcial en Mi lista.
        </div>
      )}
      {Object.entries(groups).map(([date, purchases]) => (
        <section key={date} className="panel">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="min-w-0 break-words text-lg font-semibold">
              {String(
                purchases[0].purchase.purchase_name ??
                  purchaseDate(purchases[0]),
              )}
            </h2>
            <button
              type="button"
              className="btn-secondary hidden shrink-0 items-center gap-2 md:flex"
              disabled={busy || !!repeatBusy}
              onClick={() => void repeat(purchaseHistoryGroupKey(purchases[0]), purchases)}
            >
              <RiShoppingCartLine aria-hidden="true" size={18} />
              Volver a comprar
            </button>
            <ActionMenu
              label="Acciones de la compra"
              items={[
                {
                  label: "Volver a comprar",
                  icon: RiShoppingCartLine,
                  disabled: busy || !!repeatBusy,
                  onSelect: () => void repeat(purchaseHistoryGroupKey(purchases[0]), purchases),
                },
              ]}
            />
          </div>
          <div className="mb-4 space-y-1">
            <p className="text-sm text-zinc-500">
              Lista: {purchases[0].listName}
            </p>
            {purchases[0].purchase.purchase_id && (
              <p className="text-sm text-zinc-500">
              {new Intl.DateTimeFormat("es-AR", {
                dateStyle: "long",
                timeStyle: "medium",
                timeZone: "America/Argentina/Buenos_Aires",
              }).format(new Date(purchases[0].purchasedAt))}
              </p>
            )}
          </div>
          <ul className="divide-y divide-zinc-100">
            {purchases.map((item) => (
              <li
                key={item.id}
                className="py-3 flex flex-wrap justify-between gap-3"
              >
                <div>
                  <p className="font-medium">
                    {String(item.purchase.name ?? "Producto")}
                  </p>
                  {typeof item.purchase.description === "string" &&
                    item.purchase.description.trim() && (
                      <p className="text-sm text-zinc-500">
                        {item.purchase.description}
                      </p>
                    )}
                  <p className="text-sm text-zinc-500">
                    {String(item.purchase.cantidad ?? "—")}{" "}
                    {isUnit(item.purchase.unit) ? item.purchase.unit : "un"}
                    {!isUnit(item.purchase.unit) &&
                    item.purchase.medida &&
                    Number(item.purchase.medida) !== 1
                      ? ` · medida anterior: ${item.purchase.medida}`
                      : ""}
                    {" · "}
                    {currency(item.purchase.precio)} por{" "}
                    {isUnit(item.purchase.unit) ? item.purchase.unit : "unidad"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold">
                    {currency(item.purchase.precio_total)}
                  </p>
                  {item.canEdit && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setEditing(item)}
                    >
                      Editar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {busy && <p role="status">Cargando compras…</p>}
      {hasMore && (
        <button
          className="btn-secondary"
          disabled={busy}
          onClick={() => void load(page + 1)}
        >
          Ver más compras
        </button>
      )}
      {editing && (
        <EditHistoricalItemModal
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

History.displayName = 'History';
