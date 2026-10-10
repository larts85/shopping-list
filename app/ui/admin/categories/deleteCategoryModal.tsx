"use client";
import Modal from "@/shared/components/ui/Modal";

import React, { useState } from "react";

interface DeleteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  idCategory: string;
  nameCategory: string;
}

const DeleteCategoryModal: React.FC<DeleteCategoryModalProps> = ({
  isOpen,
  onClose,
  idCategory,
  nameCategory,
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
      const response = await fetch("/api/categories/delete-category", {
        method: "DELETE",
        body: JSON.stringify(idCategory),
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
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar categoría">
      <div className="mb-6 space-y-3 text-center">
        ¿Eliminar esta categoría?
        <h2 className="break-words text-2xl font-semibold">"{nameCategory}"</h2>
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
export default DeleteCategoryModal;
