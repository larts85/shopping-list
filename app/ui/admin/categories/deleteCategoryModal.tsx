"use client";

import React from "react";

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
  if (!isOpen) return null;

  const handleDeleteCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/categories/delete-category", {
      method: "DELETE",
      body: JSON.stringify(idCategory),
      headers: {
        "content-Type": "application/json",
      },
    });
    onClose();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full">
        <h3 className="text-lg font-semibold p-8 flex items-center flex-col">
          Confirma que desea eliminar la categoria:
          <h2 className="text-2xl flex justify-center">"{nameCategory}"</h2>
        </h3>
        <form onSubmit={handleDeleteCategory} className="space-y-4">
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Borrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default DeleteCategoryModal;
