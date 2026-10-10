"use client";
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
      !Number.isFinite(Number(cantidad)) ||
      Number(cantidad) <= 0 ||
      !Number.isFinite(Number(medida)) ||
      Number(medida) <= 0 ||
      precio === "" ||
      !Number.isFinite(Number(precio)) ||
      Number(precio) < 0
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
      const response = await fetch("/api/list/set-bought", {
        method: "PUT",
        body: JSON.stringify(propsBought),
        headers: {
          "content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("No se pudo guardar la compra");

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
    } catch {
      alert("Hubo un error al intentar guardar los datos");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-10 max-w-lg w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4"></div>
            <h2 className="text-lg text-black">Cargando...</h2>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-normal text-black">
                {nameProductList}
              </h2>
              <button
                className="text-gray-600 hover:text-black focus:outline-none p-1 transition-colors"
                onClick={() => onClose(null)}
                disabled={isLoading}
                aria-label="Cerrar"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="flex flex-col">
                <label className="text-base font-normal text-black mb-3">
                  Cantidad
                </label>
                <input
                  type="number"
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  className="px-4 py-3 text-base border border-gray-300 focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-base font-normal text-black mb-3">
                  Medida
                </label>
                <input
                  type="number"
                  value={medida}
                  onChange={(e) => setMedida(e.target.value)}
                  className="px-4 py-3 text-base border border-gray-300 focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex flex-col col-span-2">
                <label className="text-base font-normal text-black mb-3">
                  Precio
                </label>
                <input
                  placeholder="Ingrese el precio"
                  type="number"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  className="px-4 py-3 text-base border border-gray-300 focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                className="px-8 py-3 text-base font-normal text-black bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                onClick={() => onClose(null)}
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                className="px-8 py-3 text-base font-normal text-white bg-black hover:opacity-80 transition-opacity"
                onClick={handleClick}
                disabled={isLoading}
              >
                Guardar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BoughtListModal;
