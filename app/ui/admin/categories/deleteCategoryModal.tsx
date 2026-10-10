"use client";

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
  const [error, setError] = useState("");
  if (!isOpen) return null;

  const handleDeleteCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/categories/delete-category", {
        method: "DELETE",
        body: JSON.stringify(idCategory),
        headers: {
          "content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("No se pudo eliminar la categoría");
      onClose();
      window.location.reload();
    } catch {
      setError("No se pudo eliminar la categoría. Intenta nuevamente.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-10 max-w-lg w-full">
        <h3 className="text-2xl font-normal text-black mb-4">
          ¿Confirma que desea eliminar la categoría?
        </h3>
        <h2 className="text-3xl font-normal text-black mb-8">
          "{nameCategory}"
        </h2>
        <form onSubmit={handleDeleteCategory} className="space-y-4">
          {error && <p role="alert">{error}</p>}
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
export default DeleteCategoryModal;
