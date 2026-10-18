"use client";

import { useState } from "react";
import { listFetch } from "@/app/lib/listClient";
import {
  compatibleUnits,
  isUnit,
  requiresWholeQuantity,
  type Unit,
} from "@/app/lib/units";
import Modal from "@/shared/components/ui/Modal";
import UnitSelect from "@/shared/components/ui/UnitSelect";
import type { PurchaseHistoryRecord } from "@/app/lib/purchaseHistory";

type HistoricalItem = PurchaseHistoryRecord & {
  id: string;
  listId: string;
  listName: string;
  canEdit: boolean;
};

function totalFromUnitPrice(precio: string, cantidad: string) {
  const unitPrice = Number(precio);
  const quantity = Number(cantidad);
  if (
    precio === "" ||
    cantidad === "" ||
    !Number.isFinite(unitPrice) ||
    !Number.isFinite(quantity) ||
    quantity <= 0
  )
    return "";
  return (Math.round((unitPrice * quantity + Number.EPSILON) * 100) / 100).toString();
}

export default function EditHistoricalItemModal({
  item,
  onClose,
  onSaved,
}: {
  item: HistoricalItem;
  onClose: () => void;
  onSaved: (item: HistoricalItem) => void;
}) {
  const purchase = item.purchase;
  const [name, setName] = useState(String(purchase.name ?? ""));
  const [description, setDescription] = useState(
    String(purchase.description ?? ""),
  );
  const [cantidad, setCantidad] = useState(String(purchase.cantidad ?? "1"));
  const [unit, setUnit] = useState<Unit>(
    isUnit(purchase.unit) ? purchase.unit : "un",
  );
  const [precio, setPrecio] = useState(
    purchase.precio == null ? "" : String(purchase.precio),
  );
  const [precioTotal, setPrecioTotal] = useState(() => {
    if (purchase.precio_total != null) return String(purchase.precio_total);
    if (purchase.precio == null) return "";
    return totalFromUnitPrice(
      String(purchase.precio),
      String(purchase.cantidad ?? "1"),
    );
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || name.trim().length > 200) {
      setError("El nombre debe tener entre 1 y 200 caracteres.");
      return;
    }
    if (description.length > 500) {
      setError("La descripción no puede superar los 500 caracteres.");
      return;
    }
    const quantity = Number(cantidad);
    const price = precio === "" ? null : Number(precio);
    const totalPrice = precioTotal === "" ? null : Number(precioTotal);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }
    if (requiresWholeQuantity(unit) && !Number.isInteger(quantity)) {
      setError("La cantidad debe ser entera para esta unidad.");
      return;
    }
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      setError("El precio debe ser igual o mayor que cero.");
      return;
    }
    if (totalPrice !== null && (!Number.isFinite(totalPrice) || totalPrice < 0)) {
      setError("El precio total debe ser igual o mayor que cero.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await listFetch("/api/historical/item", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "X-List-ID": item.listId,
        },
        body: JSON.stringify({ id: item.id, name, description, cantidad: quantity, unit, precio: price, precio_total: totalPrice }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudieron guardar los cambios.");
      const updated = result as HistoricalItem;
      onSaved(updated);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudieron guardar los cambios.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={() => !saving && onClose()} title="Editar producto histórico">
      <h2 className="mb-4 text-xl font-semibold">Editar producto histórico</h2>
      {error && <p role="alert" className="error-notice mb-4">{error}</p>}
      <form onSubmit={save} className="space-y-4">
        <label className="block text-sm font-medium">
          Producto
          <input className="field mt-2" value={name} maxLength={200} required onChange={(e) => setName(e.target.value)} disabled={saving} />
        </label>
        <label className="block text-sm font-medium">
          Descripción (opcional)
          <textarea className="field mt-2 min-h-20 resize-y" value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} disabled={saving} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm font-medium">
            Cantidad
            <input
              className="field mt-2"
              type="number"
              min={requiresWholeQuantity(unit) ? "1" : "0.000001"}
              step={requiresWholeQuantity(unit) ? "1" : "any"}
              value={cantidad}
              onChange={(event) => {
                const nextQuantity = event.target.value;
                const currentQuantity = Number(cantidad);
                const currentUnitPrice =
                  precio !== ""
                    ? Number(precio)
                    : precioTotal !== "" && currentQuantity > 0
                      ? Number(precioTotal) / currentQuantity
                      : null;
                setCantidad(nextQuantity);
                if (currentUnitPrice !== null && Number.isFinite(currentUnitPrice)) {
                  const nextPrice = String(currentUnitPrice);
                  setPrecio(nextPrice);
                  setPrecioTotal(totalFromUnitPrice(nextPrice, nextQuantity));
                }
              }}
              required
              disabled={saving}
            />
          </label>
          <div className="text-sm font-medium">
            Unidad
            <UnitSelect
              value={unit}
              options={compatibleUnits(
                isUnit(purchase.unit) ? purchase.unit : "un",
              )}
              onChange={setUnit}
              disabled={saving}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Precio por unidad (opcional)
            <input
              className="field mt-2"
              type="number"
              min="0"
              step="any"
              value={precio}
              onChange={(event) => {
                const nextPrice = event.target.value;
                setPrecio(nextPrice);
                setPrecioTotal(totalFromUnitPrice(nextPrice, cantidad));
              }}
              disabled={saving}
            />
          </label>
          <label className="block text-sm font-medium">
            Precio total (opcional)
            <input
              className="field mt-2"
              type="number"
              min="0"
              step="any"
              value={precioTotal}
              onChange={(event) => {
                const nextTotal = event.target.value;
                setPrecioTotal(nextTotal);
                if (nextTotal === "") {
                  setPrecio("");
                  return;
                }
                const total = Number(nextTotal);
                const quantity = Number(cantidad);
                if (Number.isFinite(total) && Number.isFinite(quantity) && quantity > 0)
                  setPrecio(String(total / quantity));
              }}
              disabled={saving}
            />
          </label>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</button>
        </div>
      </form>
    </Modal>
  );
}

EditHistoricalItemModal.displayName = "EditHistoricalItemModal";
