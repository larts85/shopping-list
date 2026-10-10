"use client";

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-10 max-w-lg w-full">
        <h2 className="text-3xl font-normal text-black mb-8">Editar Categoría</h2>
        <form onSubmit={handleEditCategory} className="space-y-8">
          <div>
            <label className="block text-base font-normal text-black mb-3">
              Nombre de la categoría
            </label>
            <input
              type="text"
              value={newNameCategory}
              onChange={(e) => setNewNameCategory(e.target.value)}
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
export default EditCategoryModal;
