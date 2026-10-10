"use client";
import Modal from "@/shared/components/ui/Modal";

import React from "react";

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
  if (!isOpen) return null;

  const handleDeleteCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/products/delete-product-by-id", {
      method: "DELETE",
      body: JSON.stringify(idProduct),
      headers: {
        "content-Type": "application/json",
      },
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar producto">
      <div className="mb-6 space-y-3 text-center">
        Confirma que desea eliminar la categoria:
        <h2 className="break-words text-2xl font-semibold">"{nameProduct}"</h2>
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
export default DeleteProductModal;
