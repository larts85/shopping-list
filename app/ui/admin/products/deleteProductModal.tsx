"use client";

import React from "react";

interface DeleteProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  idProduct: string;
  nameProduct: string;
}

const DeleteProductModal: React.FC<DeleteProductModalProps> = ({
  isOpen,
  onClose,
  idProduct,
  nameProduct,
}) => {
  if (!isOpen) return null;

  const handleDeleteCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch("/api/products/delete-product-by-id", {
      method: "DELETE",
      body: JSON.stringify(idProduct),
      headers: {
        "content-Type": "application/json",
      },
    });
    if (!response.ok) {
      const data = await response.json();
      alert(data.error || "No se pudo completar la operación");
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-10 max-w-lg w-full">
        <h3 className="text-2xl font-normal text-black mb-4">
          ¿Confirma que desea eliminar el producto?
        </h3>
        <h2 className="text-3xl font-normal text-black mb-8">
          "{nameProduct}"
        </h2>
        <form onSubmit={handleDeleteCategory} className="space-y-4">
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 text-base font-normal text-black bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-8 py-3 text-base font-normal text-white bg-black hover:opacity-80 transition-opacity"
            >
              Eliminar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default DeleteProductModal;
