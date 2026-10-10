"use client";
import Modal from "@/shared/components/ui/Modal";

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      const product = {
        idProduct: idProduct,
        newNameProduct: newNameProduct,
      };
      const response = await fetch("/api/products/edit-name-product", {
        method: "PUT",
        body: JSON.stringify(product),
        headers: {
          "content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Request failed");
      onClose();
    } catch {
      setError("No pudimos completar el cambio. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleChange = (event: SyntheticEvent) => {
    const target = event.target as HTMLInputElement;
    const nameCategory = capitalize(target.value);
    setNewNameProduct(nameCategory);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar producto">
      <h2 className="text-xl font-semibold mb-4">Editar producto</h2>
      {error && (
        <p role="alert" className="error-notice mb-4">
          {error}
        </p>
      )}
      <form onSubmit={handleEditProduct} className="space-y-4">
        <div>
          <label
            htmlFor="editProductModal-field-0"
            className="block text-sm font-medium text-gray-700"
          >
            Producto
          </label>
          <input
            id="editProductModal-field-0"
            type="text"
            value={newNameProduct}
            onChange={handleChange}
            required
            className="field mt-2"
          />
        </div>
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
export default EditProductModal;
