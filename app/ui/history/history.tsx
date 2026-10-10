"use client";
import { useEffect, useState } from "react";
import { isUnit } from "@/app/lib/units";
type Item = {
  id: string;
  purchase: Record<string, string | number | null>;
  purchasedAt: string;
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
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(0);
  const [retryPage, setRetryPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  async function load(next: number) {
    setRetryPage(next);
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
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
  const groups = items.reduce(
    (acc, item) => {
      const key = item.purchase.fecha
        ? String(item.purchase.fecha)
        : new Intl.DateTimeFormat("es-AR", {
            dateStyle: "long",
            timeZone: "America/Argentina/Buenos_Aires",
          }).format(new Date(item.purchasedAt));
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
          pulsa Finalizar compra en Mi lista.
        </div>
      )}
      {Object.entries(groups).map(([date, purchases]) => (
        <section key={date} className="panel">
          <h2 className="text-lg font-semibold mb-4">{date}</h2>
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
