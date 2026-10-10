"use client";
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

  if (!isOpen) return null;

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const category = {
      idCategory: idCategory,
      newNameCategory: newNameCategory,
    };
    await fetch("/api/categories/edit-category", {
      method: "PUT",
      body: JSON.stringify(category),
      headers: {
        "content-Type": "application/json",
      },
    });
    onClose();
    window.location.reload();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar categoría">
      <h2 className="text-xl font-semibold mb-4">Editar categoría</h2>
      <form onSubmit={handleEditCategory} className="space-y-4">
        <div>
          <label
            htmlFor="editCategoryModal-field-0"
            className="block text-sm font-medium text-gray-700"
          >
            Categoria
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
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            Editar
          </button>
        </div>
      </form>
    </Modal>
  );
};
export default EditCategoryModal;
