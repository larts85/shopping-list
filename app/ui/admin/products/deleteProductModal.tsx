"use client";
import Modal from "@/shared/components/ui/Modal";

import React, { useState } from "react";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleDeleteCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/products/delete-product-by-id", {
        method: "DELETE",
        body: JSON.stringify(idProduct),
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar producto">
      <div className="mb-6 space-y-3 text-center">
        ¿Eliminar este producto?
        <h2 className="break-words text-2xl font-semibold">"{nameProduct}"</h2>
      </div>
      {error && (
        <p role="alert" className="error-notice mb-4">
          {error}
        </p>
      )}
      <form onSubmit={handleDeleteCategory} className="space-y-4">
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-danger">
            {isSubmitting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
export default DeleteProductModal;
