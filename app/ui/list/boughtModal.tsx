"use client";
import Modal from "@/shared/components/ui/Modal";
import { useState } from "react";
import { IList } from "@/app/lib/types";

interface ListModalProps {
  isOpen: boolean;
  onClose: (updateList: IList | null) => void;
  idList: string;
  nameProductList: string;
  idProduct: string;
  idCategory: string;
  cantidadp: string;
  medidap: string;
}

const BoughtListModal: React.FC<ListModalProps> = ({
  isOpen,
  onClose,
  idList,
  nameProductList,
  idProduct,
  idCategory,
  cantidadp,
  medidap,
}) => {
  const [cantidad, setCantidad] = useState<number | string>(cantidadp);
  const [medida, setMedida] = useState<number | string>(medidap);
  const [precio, setPrecio] = useState<number | string>("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleClick = async () => {
    if (
      isNaN(Number(cantidad)) ||
      isNaN(Number(medida)) ||
      isNaN(Number(precio))
    ) {
      alert("Por favor, ingresa valores numéricos válidos.");
      return;
    }
    setIsLoading(true);

    try {
      const propsBought = {
        idList,
        cantidad,
        medida: Number(medida),
        precio: Number(precio),
      };
      await fetch("/api/list/set-bought", {
        method: "PUT",
        body: JSON.stringify(propsBought),
        headers: {
          "content-Type": "application/json",
        },
      });

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
      };
      setIsLoading(false);
      onClose(updateList);
    } catch (error) {
      alert("Hubo un error al intentar guardar los datos");
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
      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm font-medium">
          Cantidad
          <input
            type="number"
            className="field mt-2"
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
          />
        </label>
        <label className="text-sm font-medium">
          Medida
          <input
            type="number"
            className="field mt-2"
            value={medida}
            onChange={(e) => setMedida(e.target.value)}
          />
        </label>
        <label className="col-span-2 text-sm font-medium">
          Precio
          <input
            type="number"
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
          onClick={() => onClose(null)}
          disabled={isLoading}
        >
          Cancelar
        </button>
        <button
          className="btn-primary"
          onClick={handleClick}
          disabled={isLoading}
        >
          {isLoading ? "Guardando…" : "Marcar comprado"}
        </button>
      </div>
    </Modal>
  );
};

export default BoughtListModal;
