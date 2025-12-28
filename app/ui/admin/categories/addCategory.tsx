"use client";

import React, { useState, SyntheticEvent } from "react";
import { capitalize } from "../../utils/capitalize";
import { TextInput, Button, ButtonVariant, ButtonType } from "../../../../shared";

export default function AddCategory() {
  const [formData, setFormData] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: SyntheticEvent) => {
    const target = event.target as HTMLInputElement;
    const nameCategory = capitalize(target.value);
    setFormData(nameCategory);
  };

  const handleSubmit = async (event: React.ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/categories/add-category", {
        method: "POST",
        body: JSON.stringify(formData),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Error al agregar la categoría");
      }

      setFormData("");
      // En lugar de recargar la página, podríamos emitir un evento o usar un estado global
      window.location.reload();
    } catch (error) {
      console.error("Error submitting form:", error);
      // Aquí podríamos mostrar un mensaje de error al usuario
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Agregar Nueva Categoría</h2>

      <form onSubmit={handleSubmit} className="flex gap-4 items-end max-w-md">
        <div className="flex-1">
          <TextInput
            type="text"
            id="category-name"
            name="name"
            value={formData}
            onChange={handleChange}
            placeholder="Ej: Verduras, Frutas, Lácteos..."
            label="Nombre de la categoría"
            required
            disabled={isSubmitting}
          />
        </div>

        <Button
          type={ButtonType.SUBMIT}
          variant={ButtonVariant.PRIMARY}
          disabled={isSubmitting || !formData.trim()}
          isLoading={isSubmitting}
        >
          {isSubmitting ? "Agregando..." : "Agregar"}
        </Button>
      </form>
    </div>
  );
}
