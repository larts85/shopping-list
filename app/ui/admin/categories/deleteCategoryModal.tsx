"use client";
import Modal from "@/shared/components/ui/Modal";

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
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar categoría">
      <div className="mb-6 space-y-3 text-center">
        Confirma que desea eliminar la categoria:
        <h2 className="break-words text-2xl font-semibold">"{nameCategory}"</h2>
      </div>
      <form onSubmit={handleDeleteCategory} className="space-y-4">
        <div className="flex justify-end space-x-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            Borrar
          </button>
        </div>
      </form>
    </Modal>
  );
};
export default DeleteCategoryModal;
