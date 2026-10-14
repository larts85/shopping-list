"use client";
import { getActiveListId, listFetch, setActiveListId } from "@/app/lib/listClient";
import { useEffect, useState } from "react";
import { isUnit } from "@/app/lib/units";
import { useRouter } from "next/navigation";
import { repeatPurchase } from "@/app/actions/historical";
import {
  purchaseDate,
  purchaseHistoryGroupKey,
  type PurchaseHistoryRecord,
} from "@/app/lib/purchaseHistory";
import ActionMenu from "@/shared/components/ui/ActionMenu";
import { RiShoppingCartLine } from "react-icons/ri";
type Item = PurchaseHistoryRecord & {
  id: string;
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
  const [error, setError] = useState("");
  async function load(next: number) {
    setRetryPage(next);
    setBusy(true);
    setError("");
    try {
      const response = await listFetch(
        `/api/historical/get-historical?page=${next}`,
      );
      if (!response.ok) throw new Error("No se pudo cargar el historial.");
      const data = await response.json();
      setItems((prev) => (next === 0 ? data.items : [...prev, ...data.items]));
      setHasMore(data.hasMore);
      setPage(next);
    } catch {
      setError("No se pudo cargar el historial. Intenta nuevamente.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load(0);
  }, []);
  async function repeat(groupKey: string, purchases: Item[]) {
    if (repeatBusy) return;
    setRepeatBusy(groupKey);
    setError("");
    try {
      const created = await repeatPurchase(
        groupKey,
        purchases.map((item) => item.id),
        getActiveListId(),
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
      const key = purchaseHistoryGroupKey(item);
      (acc[key] ||= []).push(item);
      return acc;
    },
    {} as Record<string, Item[]>,
  );
  return (
    <div className="page-shell space-y-6">
      <h1 className="text-2xl font-semibold">Historial de compras</h1>
      <p className="text-sm text-zinc-500">
        Compras finalizadas del hogar activo, incluidas las importadas. Los
        productos pendientes siguen en Mi lista.
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
              onClick={() => void repeat(date, purchases)}
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
                  onSelect: () => void repeat(date, purchases),
                },
              ]}
            />
          </div>
          {purchases[0].purchase.purchase_id && (
            <p className="text-sm text-zinc-500 mb-4">
              {new Intl.DateTimeFormat("es-AR", {
                dateStyle: "long",
                timeStyle: "medium",
                timeZone: "America/Argentina/Buenos_Aires",
              }).format(new Date(purchases[0].purchasedAt))}
            </p>
          )}
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
                <p className="font-semibold">
                  {currency(item.purchase.precio_total)}
                </p>
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
    </div>
  );
}

History.displayName = 'History';
