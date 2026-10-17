"use client";
import { listFetch } from "@/app/lib/listClient";
import Modal from "@/shared/components/ui/Modal";
import { useRef, useState } from "react";
import UnitSelect from "@/shared/components/ui/UnitSelect";
import {
  compatibleUnits,
  requiresWholeQuantity,
  type Unit,
} from "@/app/lib/units";
import { IList } from "@/app/lib/types";

interface ListModalProps {
  isOpen: boolean;
  onClose: (updateList: IList | null) => void;
  idList: string;
  nameProductList: string;
  idProduct: string;
  idCategory: string;
  cantidadp: string;
  unitp: Unit;
  productUnit: Unit;
  availableUnits: Unit[];
  description?: string;
}

const BoughtListModal: React.FC<ListModalProps> = ({
  isOpen,
  onClose,
  idList,
  nameProductList,
  idProduct,
  idCategory,
  cantidadp,
  unitp,
  productUnit,
  availableUnits,
  description: initialDescription = "",
}) => {
  const options = availableUnits.length
    ? availableUnits
    : compatibleUnits(productUnit);
  const unitMatches = options.includes(unitp);
  const initialUnit = unitMatches ? unitp : (options[0] ?? productUnit);
  const [cantidad, setCantidad] = useState<number | string>(
    unitMatches ? cantidadp : "",
  );
  const [unit, setUnit] = useState<Unit>(initialUnit);
  const medida = 1;
  const [precioUnitario, setPrecioUnitario] = useState("");
  const [precioTotal, setPrecioTotal] = useState("");
  const [description, setDescription] = useState(initialDescription);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const markBoughtRef = useRef<HTMLButtonElement>(null);

  if (!isOpen) return null;

  const handleClick = async () => {
    if (
      !Number.isFinite(Number(cantidad)) ||
      Number(cantidad) <= 0 ||
      !Number.isFinite(Number(medida)) ||
      Number(medida) <= 0 ||
      (precioUnitario !== "" &&
        (!Number.isFinite(Number(precioUnitario)) ||
          Number(precioUnitario) < 0)) ||
      (precioTotal !== "" &&
        (!Number.isFinite(Number(precioTotal)) || Number(precioTotal) < 0))
    ) {
      setError("Completa una cantidad mayor que cero y revisa el precio.");
      return;
    }
    if (requiresWholeQuantity(unit) && !Number.isInteger(Number(cantidad))) {
      setError("La cantidad debe ser un número entero para esta unidad.");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      const precio =
        precioTotal !== ""
          ? Number(precioTotal)
          : precioUnitario === ""
            ? null
            : Number(precioUnitario);
      const precioMode = precioTotal !== "" ? "total" : "unit";
      const unitPrice =
        precio === null
          ? null
          : precioMode === "total"
            ? precio / Number(cantidad)
            : precio;
      const totalPrice =
        precio === null
          ? null
          : precioMode === "total"
            ? precio
            : Number(cantidad) * precio;
      const propsBought = {
        idList,
        cantidad,
        medida: Number(medida),
        unit,
        precio,
        precioMode,
        description: description.trim(),
      };
      const response = await listFetch("/api/list/set-bought", {
        method: "PUT",
        body: JSON.stringify(propsBought),
        headers: {
          "content-Type": "application/json",
        },
      });

      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const errorMessage =
          result &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "No pudimos registrar la compra. Intenta nuevamente.";
        const errorId =
          result &&
          typeof result === "object" &&
          "errorId" in result &&
          typeof result.errorId === "string"
            ? result.errorId
            : null;
        throw new Error(
          errorId ? `${errorMessage} (referencia ${errorId})` : errorMessage,
        );
      }
      const updateList = {
        id: idList,
        id_product: idProduct,
        name: nameProductList,
        id_category: idCategory,
        cantidad: cantidad.toString(),
        medida: medida.toString(),
        precio: unitPrice === null ? "" : unitPrice.toString(),
        precioValue: unitPrice,
        precioTotal:
          totalPrice === null
            ? ""
            : new Intl.NumberFormat("es-AR", {
                style: "currency",
                currency: "ARS",
              }).format(totalPrice),
        precioKg: "",
        kgTotal: "",
        comprado: "1",
        unit,
        productUnit,
        description: description.trim(),
      };
      setIsLoading(false);
      onClose(updateList);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No pudimos registrar la compra. Intenta nuevamente.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => onClose(null)}
      title="Registrar compra"
      initialFocusRef={markBoughtRef}
    >
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
            Registrar compra
          </p>
          <h2 className="mt-2 break-words text-2xl font-semibold">
            {nameProductList}
          </h2>
        </div>
        <button
          className="icon-button"
          aria-label="Cerrar"
          onClick={() => onClose(null)}
          disabled={isLoading}
        >
          ✕
        </button>
      </div>
      {!unitMatches && (
        <p className="text-sm text-zinc-500 mb-4">
          La unidad del catálogo cambió. Ingresa nuevamente la cantidad y el
          precio por la unidad actual.
        </p>
      )}
      {error && (
        <p role="alert" className="error-notice mb-4">
          {error}
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleClick();
        }}
      >
        <div className="grid grid-cols-2 items-start gap-4">
          <label className="min-w-0 text-sm font-medium">
            Cantidad
            <input
              type="number"
              required
              min={requiresWholeQuantity(unit) ? "1" : "0.000001"}
              step={requiresWholeQuantity(unit) ? "1" : "any"}
              className="field mt-2"
              value={cantidad}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || Number(value) > 0) setCantidad(value);
                else setError("La cantidad debe ser mayor que cero.");
              }}
            />
          </label>
          <UnitSelect
            value={unit}
            onChange={setUnit}
            options={options}
            disabled={isLoading}
          />
          <label className="col-span-2 text-sm font-medium">
            Descripción (opcional)
            <textarea
              className="field mt-2 min-h-24 resize-y"
              value={description}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Añade una descripción"
              disabled={isLoading}
            />
          </label>
          <label className="col-span-2 text-sm font-medium">
            Precio por unidad de medida (opcional)
            <input
              type="number"
              min="0"
              step="any"
              className="field mt-2"
              placeholder="Precio por unidad de medida"
              value={precioUnitario}
              disabled={isLoading || precioTotal !== ""}
              onChange={(e) => setPrecioUnitario(e.target.value)}
            />
          </label>
          <label className="col-span-2 text-sm font-medium">
            Total de esta compra (opcional)
            <input
              type="number"
              min="0"
              step="any"
              className="field mt-2"
              placeholder="Total pagado por este producto"
              value={precioTotal}
              disabled={isLoading || precioUnitario !== ""}
              onChange={(e) => setPrecioTotal(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="btn-secondary"
            type="button"
            onClick={() => onClose(null)}
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            className="btn-primary"
            type="submit"
            disabled={isLoading}
            ref={markBoughtRef}
          >
            {isLoading ? "Guardando…" : "Marcar comprado"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BoughtListModal;

BoughtListModal.displayName = 'BoughtListModal';
