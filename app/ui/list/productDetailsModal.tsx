"use client";

import { useState } from "react";
import { RiFlashlightFill } from "react-icons/ri";
import { listFetch } from "@/app/lib/listClient";
import type { IList } from "@/app/lib/types";
import {
  compatibleUnits,
  requiresWholeQuantity,
  type Unit,
} from "@/app/lib/units";
import UnitSelect from "@/shared/components/ui/UnitSelect";
import Modal from "@/shared/components/ui/Modal";

interface ProductDetailsModalProps {
  item: IList;
  canManageList: boolean;
  onClose: (updated: IList | null) => void;
}

export default function ProductDetailsModal({
  item,
  canManageList,
  onClose,
}: ProductDetailsModalProps) {
  const [description, setDescription] = useState(item.description ?? "");
  const [urgentPurchase, setUrgentPurchase] = useState(
    item.urgentPurchase ?? false,
  );
  const [cantidad, setCantidad] = useState(item.cantidad);
  const [unit, setUnit] = useState<Unit>(item.unit ?? item.productUnit ?? "un");
  const [precio, setPrecio] = useState(
    item.precioValue == null ? "" : String(item.precioValue),
  );
  const [precioTotal, setPrecioTotal] = useState(item.precioTotalValue == null
    ? item.precioValue == null ? "" : String(Number(item.precioValue) * Number(item.cantidad || 1))
    : String(item.precioTotalValue));
  const [discountType, setDiscountType] = useState<"percent" | "amount" | "">(item.discountType ?? "");
  const [discountValue, setDiscountValue] = useState(item.discountValue == null ? "" : String(item.discountValue));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const bought = item.comprado === "1";
  const canEditPurchase = !bought || canManageList;
  const options = Array.from(
    new Set([
      ...(item.availableUnits?.length
        ? item.availableUnits
        : compatibleUnits(item.productUnit ?? item.unit ?? "un")),
      unit,
    ]),
  );

  async function saveDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedDescription = description.trim();
    if (trimmedDescription.length > 500) {
      setError("La descripción no puede superar los 500 caracteres.");
      return;
    }
    if (canEditPurchase && cantidad !== "") {
      if (!Number.isFinite(Number(cantidad)) || Number(cantidad) <= 0) {
        setError("La cantidad debe ser mayor que cero.");
        return;
      }
    } else if (bought && canEditPurchase) {
      setError("La cantidad comprada debe ser mayor que cero.");
      return;
    }
    if (
      canEditPurchase &&
      cantidad !== "" &&
      requiresWholeQuantity(unit) &&
      !Number.isInteger(Number(cantidad))
    ) {
      setError("La cantidad debe ser un número entero para esta unidad.");
      return;
    }
    const parsedDiscount = discountValue === "" ? null : Number(discountValue);
    if (discountType && (parsedDiscount === null || !Number.isFinite(parsedDiscount) || parsedDiscount < 0 || (discountType === "percent" && parsedDiscount > 100))) {
      setError(discountType === "percent" ? "El descuento debe estar entre 0 y 100 %." : "El monto de descuento debe ser válido.");
      return;
    }
    if (
      bought &&
      canEditPurchase &&
      precio !== "" &&
      (!Number.isFinite(Number(precio)) || Number(precio) < 0)
    ) {
      setError("El precio debe ser igual o mayor que cero.");
      return;
    }
    if (bought && canManageList && precioTotal !== "" && (!Number.isFinite(Number(precioTotal)) || Number(precioTotal) < 0)) {
      setError("El precio total debe ser igual o mayor que cero.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        id: item.id,
        description: trimmedDescription,
        urgentPurchase,
      };
      if (canEditPurchase) {
        body.cantidad = cantidad;
        body.unit = unit;
        if (bought) {
          body.precio = precio === "" ? null : Number(precio);
          body.precio_total = precioTotal === "" ? null : Number(precioTotal);
        }
      }
      if (!bought || canManageList) {
        body.discount_type = discountType || null;
        body.discount_value = discountType ? parsedDiscount : null;
      }
      const response = await listFetch("/api/list/item-details", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "No pudimos guardar los detalles.");
      }
      const updatedPrice = bought
        ? precio === ""
          ? null
          : Number(precio)
        : item.precioValue ?? null;
      const updatedTotal = bought ? precioTotal === "" ? null : Number(precioTotal) : item.precioTotalValue ?? null;
      const purchaseChanged =
        bought &&
        canManageList &&
        (Number(cantidad) !== Number(item.cantidad) ||
          unit !== (item.unit ?? item.productUnit ?? "un") ||
          updatedPrice !== (item.precioValue ?? null) ||
          updatedTotal !== (item.precioTotalValue ?? null));
      const updatedPrecioTotal = purchaseChanged
        ? updatedPrice === null
          ? ""
          : new Intl.NumberFormat("es-AR", {
              style: "currency",
              currency: "ARS",
            }).format(updatedTotal ?? Number(cantidad) * updatedPrice)
        : item.precioTotal;
      onClose({
        ...item,
        description: trimmedDescription,
        urgentPurchase,
        precioTotal: updatedPrecioTotal,
        precioTotalValue: purchaseChanged
          ? updatedPrice === null
            ? null
            : updatedTotal ?? Number(cantidad) * updatedPrice
          : item.precioTotalValue,
        discountType: !bought || canManageList ? discountType || null : item.discountType ?? null,
        discountValue: !bought || canManageList ? parsedDiscount : item.discountValue ?? null,
        ...(canEditPurchase
          ? {
              cantidad: cantidad.toString(),
              unit,
              ...(bought
                ? {
                    precio: updatedPrice === null ? "" : String(updatedPrice),
                    precioValue: updatedPrice,
                    discountType: discountType || null,
                    discountValue: parsedDiscount,
                  }
                : {}),
            }
          : {}),
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No pudimos guardar los detalles.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={() => {
        if (!isSaving) onClose(null);
      }}
      title={`Detalles de ${item.name}`}
    >
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
            {bought ? "Datos de compra" : "Detalles del producto"}
          </p>
          <h2 className="mt-2 break-words text-2xl font-semibold">
            {item.name}
          </h2>
        </div>
        <button
          className="icon-button"
          aria-label="Cerrar detalles"
          type="button"
          onClick={() => onClose(null)}
          disabled={isSaving}
        >
          ✕
        </button>
      </div>
      {error && (
        <p role="alert" className="error-notice mb-4">
          {error}
        </p>
      )}
      <form onSubmit={saveDetails}>
        {!item.isProvisional && (
          <label className="mb-5 flex cursor-pointer items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-950">
            <input
              type="checkbox"
              checked={urgentPurchase}
              onChange={(event) => setUrgentPurchase(event.target.checked)}
              disabled={isSaving}
            />
            <RiFlashlightFill className="text-amber-500" aria-hidden="true" />
            Compra urgente
          </label>
        )}
        <label className="block text-sm font-medium">
          Descripción (opcional)
          <textarea
            className="field mt-2 min-h-24 resize-y"
            value={description}
            maxLength={500}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Añade una descripción"
            disabled={isSaving}
          />
        </label>
        {bought && !canManageList && (
          <p className="mt-4 text-sm text-zinc-500">
            Solo el propietario puede editar los datos de una compra registrada.
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 items-start gap-4">
          <label className="min-w-0 text-sm font-medium">
            Cantidad
            <input
              type="number"
              min={requiresWholeQuantity(unit) ? "1" : "0.000001"}
              step={requiresWholeQuantity(unit) ? "1" : "any"}
              required={bought && canManageList}
              className="field mt-2"
              value={cantidad}
              onChange={(event) => { const next = event.target.value; setCantidad(next); const quantity = Number(next); if (precio !== "" && Number.isFinite(Number(precio)) && quantity > 0) setPrecioTotal(String(Number(precio) * quantity)); }}
              disabled={isSaving || !canEditPurchase}
            />
          </label>
          <label className="min-w-0 text-sm font-medium">
            Unidad
            <UnitSelect
              label="Unidad"
              value={unit}
              onChange={setUnit}
              options={options}
              disabled={isSaving || !canEditPurchase}
              hideLabel
            />
          </label>
          {bought && (
            <>
            <label className="col-span-2 text-sm font-medium">
              Precio por unidad de medida (opcional)
              <input
                type="number"
                min="0"
                step="any"
                className="field mt-2"
                value={precio}
                onChange={(event) => { const next = event.target.value; setPrecio(next); const quantity = Number(cantidad); setPrecioTotal(next === "" || !Number.isFinite(Number(next)) || quantity <= 0 ? "" : String(Number(next) * quantity)); }}
                disabled={isSaving || !canManageList}
                placeholder="Sin precio"
              />
            </label>
            <label className="col-span-2 text-sm font-medium">
              Precio total (opcional)
              <input type="number" min="0" step="any" className="field mt-2" value={precioTotal} onChange={(event) => { const next = event.target.value; setPrecioTotal(next); const quantity = Number(cantidad); setPrecio(next === "" || !Number.isFinite(Number(next)) || quantity <= 0 ? "" : String(Number(next) / quantity)); }} disabled={isSaving || !canManageList} placeholder="Sin precio" />
            </label>
            </>
          )}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <label className="text-sm font-medium">Descuento del producto
            <select className="field mt-2" value={discountType} onChange={(event) => setDiscountType(event.target.value as "percent" | "amount" | "")} disabled={isSaving || (bought && !canManageList)}>
              <option value="">Sin descuento</option><option value="percent">Porcentaje</option><option value="amount">Monto fijo (ARS)</option>
            </select>
          </label>
          <label className="text-sm font-medium">{discountType === "percent" ? "Porcentaje" : "Monto (ARS)"}
            <input type="number" min="0" max={discountType === "percent" ? "100" : undefined} step="any" className="field mt-2" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} disabled={isSaving || !discountType || (bought && !canManageList)} />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="btn-secondary"
            type="button"
            onClick={() => onClose(null)}
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button className="btn-primary" type="submit" disabled={isSaving}>
            {isSaving ? "Guardando…" : "Guardar detalles"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

ProductDetailsModal.displayName = 'ProductDetailsModal';
