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
import Autocomplete from "@/shared/components/ui/Autocomplete";
import ActionMenu from "@/shared/components/ui/ActionMenu";
import { RiCheckLine, RiCloseLine } from "react-icons/ri";
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
  const [hasList, setHasList] = useState(false);
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
    const active = getActiveListId();
    setHasList(Boolean(active));
    if (!active) return;
    try {
      const [data, suggestions, catalog, list] = await Promise.all([
        getHouseholdData(getActiveListId()),
        getSuggestions(getActiveListId()),
        getProducts(getActiveListId()),
        getList(getActiveListId()),
      ]);
      setOwner(data.canManageList);
      setItems(suggestions);
      setProducts(catalog);
      setListed(
        list
          .filter((p) => p.comprado !== "1" && p.id_product !== null)
          .map((p) => p.id_product!),
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
  useEffect(() => {
    if (productId && !choices.some((product) => product.id === productId))
      setProductId("");
  }, [productId, choices]);
  if (!hasList)
    return (
      <p className="text-sm text-zinc-500">
        Elige una lista desde Home para ver sus sugerencias.
      </p>
    );
  return (
    <section className="panel space-y-4" aria-label="Sugerencias de la lista">
      <h2 className="text-xl font-semibold">
        {owner ? "Revisar sugerencias" : "Sugerir cambios"}
      </h2>
      <p className="text-sm text-zinc-500">
        Las sugerencias no modifican la lista hasta que el propietario de la
        lista las aprueba.
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
            if (!productId) {
              setError("Selecciona un producto de la lista.");
              return;
            }
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
          <div className="flex flex-wrap gap-3 items-center">
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
            <Autocomplete
              label="Producto"
              value=""
              selectedValue={productId}
              selectedLabel={choices.find((p) => p.id === productId)?.name ?? ""}
              options={choices.map((p) => ({ value: p.id, label: p.name }))}
              onChange={(value) => {
                setProductId(value);
                if (!value) setUnit("un");
              }}
              onSelect={(option) => {
                setProductId(option.value);
                setUnit(products.find((p) => p.id === option.value)?.unit ?? "un");
              }}
              placeholder={choices.length ? "Selecciona un producto" : "No hay productos disponibles"}
              disabled={busy || choices.length === 0}
              required
              className="field mt-2"
            />
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
                  options={product?.availableUnits ?? compatibleUnits(product?.unit ?? "un")}
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
      <h3 className="text-lg font-semibold">
        Historial de sugerencias de la lista
      </h3>
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
              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-3 md:flex">
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
                <ActionMenu
                  label={`Acciones para la sugerencia de ${s.name}`}
                  items={[
                    {
                      label: "Aprobar sugerencia",
                      icon: RiCheckLine,
                      disabled: busy,
                      onSelect: () =>
                        void run(() =>
                          reviewSuggestion(s.id, "approve", getActiveListId()),
                        ),
                    },
                    {
                      label: "Rechazar sugerencia",
                      icon: RiCloseLine,
                      destructive: true,
                      disabled: busy,
                      onSelect: () =>
                        void run(() =>
                          reviewSuggestion(s.id, "reject", getActiveListId()),
                        ),
                    },
                  ]}
                />
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

Suggestions.displayName = 'Suggestions';
