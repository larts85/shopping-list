"use client";
import Modal from "@/shared/components/ui/Modal";
import { useState } from "react";
import UnitSelect from "@/shared/components/ui/UnitSelect";
import { compatibleUnits, type Unit } from "@/app/lib/units";
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
}) => {
  const unitMatches = compatibleUnits(productUnit).includes(unitp);
  const [cantidad, setCantidad] = useState<number | string>(
    unitMatches ? cantidadp : "",
  );
  const [unit, setUnit] = useState<Unit>(unitMatches ? unitp : productUnit);
  const medida = 1;
  const [precio, setPrecio] = useState<number | string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleClick = async () => {
    if (
      !Number.isFinite(Number(cantidad)) ||
      Number(cantidad) <= 0 ||
      !Number.isFinite(Number(medida)) ||
      Number(medida) <= 0 ||
      !Number.isFinite(Number(precio)) ||
      Number(precio) < 0 ||
      precio === ""
    ) {
      setError("Completa una cantidad mayor que cero y un precio válido.");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      const propsBought = {
        idList,
        cantidad,
        medida: Number(medida),
        unit,
        precio: Number(precio),
      };
      const response = await fetch("/api/list/set-bought", {
        method: "PUT",
        body: JSON.stringify(propsBought),
        headers: {
          "content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Error registering purchase");
      const updateList = {
        id: idList,
        id_product: idProduct,
        name: nameProductList,
        id_category: idCategory,
        cantidad: cantidad.toString(),
        medida: medida.toString(),
        precio: precio.toString(),
        precioTotal: "",
        precioKg: "",
        kgTotal: "",
        comprado: "1",
        unit,
        productUnit,
      };
      setIsLoading(false);
      onClose(updateList);
    } catch (error) {
      setError("No pudimos registrar la compra. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => onClose(null)}
      title="Registrar compra"
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
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm font-medium">
            Cantidad
            <input
              type="number"
              required
              min="0"
              step="any"
              className="field mt-2"
              value={cantidad}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || Number(value) > 0) setCantidad(value);
                else setError("La cantidad debe ser mayor que cero.");
              }}
            />
          </label>
          <label className="text-sm font-medium">
            Unidad de medida
            <UnitSelect
              value={unit}
              onChange={setUnit}
              options={compatibleUnits(productUnit)}
              disabled={isLoading}
            />
          </label>
          <label className="col-span-2 text-sm font-medium">
            Precio por {unit}
            <input
              type="number"
              required
              min="0"
              step="any"
              className="field mt-2"
              placeholder="Precio"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
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
          <button className="btn-primary" type="submit" disabled={isLoading}>
            {isLoading ? "Guardando…" : "Marcar comprado"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BoughtListModal;
