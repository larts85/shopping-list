"use client";
import { listFetch } from "@/app/lib/listClient";
import Modal from "@/shared/components/ui/Modal";

import { useState, SyntheticEvent } from "react";
import UnitSelect from "@/shared/components/ui/UnitSelect";
import type { Unit } from "@/app/lib/units";
import { capitalize } from "../../utils/capitalize";
import AvailableUnitsField from "./availableUnitsField";
import Autocomplete from "@/shared/components/ui/Autocomplete";

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  idProduct: string;
  nameProduct: string;
  unitProduct: Unit;
  availableUnitsProduct: Unit[];
  categories: { id: string; name: string }[];
  idCategory: string;
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  idProduct,
  nameProduct,
  unitProduct,
  availableUnitsProduct,
  categories,
  idCategory,
}) => {
  const [unit, setUnit] = useState<Unit>(unitProduct);
  const [availableUnits, setAvailableUnits] = useState<Unit[]>(availableUnitsProduct);
  const [newNameProduct, setNewNameProduct] = useState(nameProduct);
  const [categoryId, setCategoryId] = useState(idCategory);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!categoryId) {
      setError("Selecciona una categoría.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const product = {
        idProduct: idProduct,
        newNameProduct: newNameProduct,
        unit,
        availableUnits,
        idCategory: categoryId,
      };
      const response = await listFetch("/api/products/edit-name-product", {
        method: "PUT",
        body: JSON.stringify(product),
        headers: {
          "content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          result.error || "No pudimos completar el cambio. Intenta nuevamente.",
        );
      }
      onClose();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No pudimos completar el cambio. Intenta nuevamente.",
      );
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
        <Autocomplete
          label="Categoría"
          value=""
          selectedValue={categoryId}
          selectedLabel={categories.find((c) => c.id === categoryId)?.name ?? ""}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          onChange={setCategoryId}
          onSelect={(option) => setCategoryId(option.value)}
          disabled={isSubmitting}
          required
          className="field mt-2"
        />
        <label className="block text-sm font-medium">
          Unidad de medida
          <UnitSelect
            value={unit}
            onChange={(value) => {
              setUnit(value);
              setAvailableUnits((current) =>
                current.includes(value) ? current : [...current, value],
              );
            }}
            disabled={isSubmitting}
          />
        </label>
        <AvailableUnitsField
          selected={availableUnits}
          onChange={setAvailableUnits}
          requiredUnit={unit}
          disabled={isSubmitting}
        />
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
