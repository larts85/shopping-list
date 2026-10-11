"use client";
import { listFetch } from "@/app/lib/listClient";
import Modal from "@/shared/components/ui/Modal";

import { useState } from "react";

interface EditCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  idCategory: string;
  nameCategory: string;
}

const EditCategoryModal: React.FC<EditCategoryModalProps> = ({
  isOpen,
  onClose,
  idCategory,
  nameCategory,
}) => {
  const [newNameCategory, setNewNameCategory] = useState(nameCategory);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      const category = {
        idCategory: idCategory,
        newNameCategory: newNameCategory,
      };
      const response = await listFetch("/api/categories/edit-category", {
        method: "PUT",
        body: JSON.stringify(category),
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
    <Modal isOpen={isOpen} onClose={onClose} title="Editar categoría">
      <h2 className="text-xl font-semibold mb-4">Editar categoría</h2>
      {error && (
        <p role="alert" className="error-notice mb-4">
          {error}
        </p>
      )}
      <form onSubmit={handleEditCategory} className="space-y-4">
        <div>
          <label
            htmlFor="editCategoryModal-field-0"
            className="block text-sm font-medium text-gray-700"
          >
            Categoría
          </label>
          <input
            id="editCategoryModal-field-0"
            type="text"
            value={newNameCategory}
            onChange={(e) => setNewNameCategory(e.target.value)}
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
export default EditCategoryModal;
