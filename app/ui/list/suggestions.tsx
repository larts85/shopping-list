"use client";
import { getActiveListId } from "@/app/lib/listClient";
import { useEffect, useState } from "react";
import { getProducts } from "@/app/actions/products";
import { getHouseholdData } from "@/app/actions/households";
import { getList } from "@/app/actions/list";
import {
  submitSuggestion,
  getSuggestions,
  reviewSuggestion,
  type ListSuggestion,
  type SuggestionInput,
} from "@/app/actions/suggestions";
import type { Product } from "@/app/lib/types";
import { compatibleUnits, type Unit } from "@/app/lib/units";
import UnitSelect from "@/shared/components/ui/UnitSelect";
const kinds = {
  add: "Agregar producto",
  quantity: "Cambiar cantidad",
  remove: "Quitar producto",
};
const statuses = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
};
export default function Suggestions({
  onChange,
}: {
  onChange?: () => Promise<void>;
}) {
  const [items, setItems] = useState<ListSuggestion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [listed, setListed] = useState<string[]>([]);
  const [owner, setOwner] = useState(false);
  const [kind, setKind] = useState<SuggestionInput["kind"]>("add");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState<Unit>("un");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function load() {
    try {
      const [data, suggestions, catalog, list] = await Promise.all([
        getHouseholdData(getActiveListId()),
        getSuggestions(getActiveListId()),
        getProducts(getActiveListId()),
        getList(getActiveListId()),
      ]);
      setOwner(data.canEditList);
      setItems(suggestions);
      setProducts(catalog);
      setListed(
        list.filter((p) => p.comprado !== "1").map((p) => p.id_product),
      );
    } catch {
      setError("No pudimos cargar las sugerencias.");
    }
  }
  useEffect(() => {
    void load();
    const refresh = () => {
      setProductId("");
      void load();
    };
    window.addEventListener("active-list-changed", refresh);
    return () => window.removeEventListener("active-list-changed", refresh);
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      await load();
      await onChange?.();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo guardar la sugerencia",
      );
    } finally {
      setBusy(false);
    }
  }
  const product = products.find((p) => p.id === productId);
  const choices = products.filter(
    (p) => kind === "add" || listed.includes(p.id),
  );
  return (
    <section className="panel space-y-4" aria-label="Sugerencias de la lista">
      <h2 className="text-xl font-semibold">
        {owner ? "Revisar sugerencias" : "Sugerir cambios"}
      </h2>
      <p className="text-sm text-zinc-500">
        Las sugerencias no modifican la lista hasta que un owneristrador las
        aprueba.
      </p>
      {error && (
        <p role="alert" className="error-notice">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {!owner && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await submitSuggestion(
                {
                  kind,
                  productId,
                  ...(kind !== "remove"
                    ? { quantity: Number(quantity), unit }
                    : {}),
                  note,
                },
                getActiveListId(),
              );
              setNote("");
              setMessage("Sugerencia enviada para revisión.");
            });
          }}
        >
          <div className="flex flex-wrap gap-3">
            <label>
              Tipo
              <select
                className="field mt-2"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as SuggestionInput["kind"]);
                  setProductId("");
                }}
              >
                {Object.entries(kinds).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Producto
              <select
                className="field mt-2"
                required
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  setUnit(
                    products.find((p) => p.id === e.target.value)?.unit ?? "un",
                  );
                }}
              >
                <option value="">Selecciona un producto</option>
                {choices.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {kind !== "remove" && (
              <>
                <label>
                  Cantidad
                  <input
                    className="field mt-2"
                    type="number"
                    required
                    min="0.000001"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </label>
                <UnitSelect
                  label="Unidad de la sugerencia"
                  value={unit}
                  options={compatibleUnits(product?.unit ?? "un")}
                  onChange={setUnit}
                />
              </>
            )}
          </div>
          <label className="block">
            Nota (opcional)
            <input
              className="field mt-2"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <button className="btn-primary" disabled={busy || !productId}>
            Enviar sugerencia
          </button>
        </form>
      )}
      <ul className="divide-y divide-zinc-200">
        {items.map((s) => (
          <li key={s.id} className="py-3 space-y-2">
            <p>
              <strong>
                {kinds[s.kind]}: {s.name}
              </strong>
              {s.quantity !== null ? ` · ${s.quantity} ${s.unit}` : ""} ·{" "}
              {statuses[s.status]}
            </p>
            <p className="text-sm text-zinc-500">
              {s.email}
              {s.note ? ` · ${s.note}` : ""}
            </p>
            {owner && s.status === "pending" && (
              <div className="flex gap-3">
                <button
                  className="btn-primary"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      reviewSuggestion(s.id, "approve", getActiveListId()),
                    )
                  }
                >
                  Aprobar
                </button>
                <button
                  className="btn-secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      reviewSuggestion(s.id, "reject", getActiveListId()),
                    )
                  }
                >
                  Rechazar
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {!items.length && (
        <p className="text-sm text-zinc-500">No hay sugerencias.</p>
      )}
    </section>
  );
}
