"use client";
import { listFetch } from "@/app/lib/listClient";

import { useState, SyntheticEvent } from "react";
import { capitalize } from "../../utils/capitalize";
import {
  TextInput,
  Button,
  ButtonVariant,
  ButtonType,
} from "../../../../shared";

export default function AddCategory() {
  const [formData, setFormData] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event: SyntheticEvent) => {
    const target = event.target as HTMLInputElement;
    const nameCategory = capitalize(target.value);
    setFormData(nameCategory);
  };

  const handleSubmit = async (event: React.ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.trim()) return;

    setIsSubmitting(true);
    setError("");
    try {
      const response = await listFetch("/api/categories/add-category", {
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
      setError("No pudimos agregar la categoría. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="panel">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Agregar Nueva Categoría
      </h2>

      {error && (
        <p role="alert" className="error-notice mb-4">
          {error}
        </p>
      )}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 sm:flex-row sm:items-end"
      >
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

AddCategory.displayName = 'AddCategory';
