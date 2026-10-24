"use client";

import { setActiveListId } from "@/app/lib/listClient";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { repeatPurchase } from "@/app/actions/historical";
import EditHistoricalItemModal from "./editHistoricalItemModal";
import HistoryPurchase from "./historyPurchase";
import HistoryStatsModal from "./historyStatsModal";
import { purchaseDate, purchaseHistoryGroupKey } from "@/app/lib/purchaseHistory";
import type { HistoryItem } from "./historyTypes";

export default function History() {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [page, setPage] = useState(0);
  const [retryPage, setRetryPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(true);
  const [repeatBusy, setRepeatBusy] = useState("");
  const [editing, setEditing] = useState<HistoryItem | null>(null);
  const [statsKey, setStatsKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);

  async function load(next: number) {
    const version = ++requestVersion.current;
    setRetryPage(next);
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/historical/get-historical?page=${next}`, { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo cargar el historial.");
      const data = await response.json();
      if (version !== requestVersion.current) return;
      setItems((prev) => (next === 0 ? data.items : [...prev, ...data.items]));
      setHasMore(data.hasMore);
      setPage(next);
    } catch {
      if (version === requestVersion.current) setError("No se pudo cargar el historial. Intenta nuevamente.");
    } finally {
      if (version === requestVersion.current) setBusy(false);
    }
  }

  useEffect(() => {
    void load(0);
    return () => { requestVersion.current++; };
  }, []);

  async function repeat(groupKey: string, purchases: HistoryItem[]) {
    if (repeatBusy) return;
    setRepeatBusy(groupKey);
    setError("");
    try {
      const created = await repeatPurchase(groupKey, purchases.map((item) => item.id), purchases[0].listId);
      setActiveListId(created.id);
      router.push(`/lists/${created.slug}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo volver a crear la lista de compra.");
    } finally {
      setRepeatBusy("");
    }
  }

  const groups = items.reduce((acc, item) => {
    const key = `${item.listId}:${purchaseHistoryGroupKey(item)}`;
    (acc[key] ||= []).push(item);
    return acc;
  }, {} as Record<string, HistoryItem[]>);
  const statsItems = statsKey ? groups[statsKey] : null;
  const statsTitle = statsItems?.[0]
    ? String(statsItems[0].purchase.purchase_name ?? purchaseDate(statsItems[0]))
    : "Compra";

  return (
    <div className="page-shell space-y-6">
      <h1 className="text-2xl font-semibold">Historial de compras</h1>
      <p className="text-sm text-zinc-500">Compras finalizadas de tus listas compartidas, incluidas las importadas.</p>
      {error && (
        <div role="alert" className="error-notice">
          {error}
          <button className="btn-secondary ml-3" disabled={busy} onClick={() => void load(retryPage)}>Reintentar</button>
        </div>
      )}
      {!busy && !error && !items.length && (
        <div className="empty-state">Todavía no hay compras finalizadas. Marca productos como comprados y pulsa Finalizar compra parcial en Mi lista.</div>
      )}
      {Object.entries(groups).map(([key, purchases]) => (
        <HistoryPurchase
          key={key}
          items={purchases}
          busy={busy}
          repeatBusy={!!repeatBusy}
          onRepeat={() => void repeat(purchaseHistoryGroupKey(purchases[0]), purchases)}
          onStats={() => setStatsKey(key)}
          onEdit={setEditing}
        />
      ))}
      {busy && <p role="status">Cargando compras…</p>}
      {hasMore && (
        <button className="btn-secondary" disabled={busy} onClick={() => void load(page + 1)}>Ver más compras</button>
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
      {statsItems && <HistoryStatsModal items={statsItems} title={statsTitle} onClose={() => setStatsKey(null)} />}
    </div>
  );
}

History.displayName = "History";
