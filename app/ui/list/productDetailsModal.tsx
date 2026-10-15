"use client";

import { useState } from "react";
import { listFetch } from "@/app/lib/listClient";
import type { IList } from "@/app/lib/types";
import { compatibleUnits, type Unit } from "@/app/lib/units";
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
  const [cantidad, setCantidad] = useState(item.cantidad);
  const [unit, setUnit] = useState<Unit>(item.unit ?? item.productUnit ?? "un");
  const [precio, setPrecio] = useState(
    item.precioValue == null ? "" : String(item.precioValue),
  );
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
      bought &&
      canEditPurchase &&
      precio !== "" &&
      (!Number.isFinite(Number(precio)) || Number(precio) < 0)
    ) {
      setError("El precio debe ser igual o mayor que cero.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        id: item.id,
        description: trimmedDescription,
      };
      if (canEditPurchase) {
        body.cantidad = cantidad;
        body.unit = unit;
        if (bought) body.precio = precio === "" ? null : Number(precio);
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
      const purchaseChanged =
        bought &&
        canManageList &&
        (Number(cantidad) !== Number(item.cantidad) ||
          unit !== (item.unit ?? item.productUnit ?? "un") ||
          updatedPrice !== (item.precioValue ?? null));
      const updatedPrecioTotal = purchaseChanged
        ? updatedPrice === null
          ? ""
          : new Intl.NumberFormat("es-AR", {
              style: "currency",
              currency: "ARS",
            }).format(Number(cantidad) * updatedPrice)
        : item.precioTotal;
      onClose({
        ...item,
        description: trimmedDescription,
        precioTotal: updatedPrecioTotal,
        ...(canEditPurchase
          ? {
              cantidad: cantidad.toString(),
              unit,
              ...(bought
                ? {
                    precio: updatedPrice === null ? "" : String(updatedPrice),
                    precioValue: updatedPrice,
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
              min="0"
              step="any"
              required={bought && canManageList}
              className="field mt-2"
              value={cantidad}
              onChange={(event) => setCantidad(event.target.value)}
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
            <label className="col-span-2 text-sm font-medium">
              Precio por unidad de medida (opcional)
              <input
                type="number"
                min="0"
                step="any"
                className="field mt-2"
                value={precio}
                onChange={(event) => setPrecio(event.target.value)}
                disabled={isSaving || !canManageList}
                placeholder="Sin precio"
              />
            </label>
          )}
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
