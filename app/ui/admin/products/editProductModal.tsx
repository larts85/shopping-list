"use client";

import { useState, SyntheticEvent } from "react";
import { capitalize } from "../../utils/capitalize";

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  idProduct: string;
  nameProduct: string;
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  idProduct,
  nameProduct,
}) => {
  const [newNameProduct, setNewNameProduct] = useState(nameProduct);

  if (!isOpen) return null;

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = {
      idProduct: idProduct,
      newNameProduct: newNameProduct,
    };
    await fetch("/api/products/edit-name-product", {
      method: "PUT",
      body: JSON.stringify(product),
      headers: {
        "content-Type": "application/json",
      },
    });
    onClose();
  };
  const handleChange = (event: SyntheticEvent) => {
    const target = event.target as HTMLInputElement;
    const nameCategory = capitalize(target.value);
    setNewNameProduct(nameCategory);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-10 max-w-lg w-full">
        <h2 className="text-3xl font-normal text-black mb-8">Editar Producto</h2>
        <form onSubmit={handleEditProduct} className="space-y-8">
          <div>
            <label className="block text-base font-normal text-black mb-3">
              Nombre del producto
            </label>
            <input
              type="text"
              value={newNameProduct}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 text-base border border-gray-300 focus:outline-none focus:border-black"
            />
          </div>
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
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default EditProductModal;
