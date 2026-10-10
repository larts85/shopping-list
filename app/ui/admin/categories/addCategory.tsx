"use client";

import { useState, SyntheticEvent } from "react";
import { capitalize } from "../../utils/capitalize";

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
    <div className="mb-16">
      <h2 className="text-4xl font-normal text-black mb-8">
        Agregar Nueva Categoría
      </h2>

      <form onSubmit={handleSubmit} className="flex gap-4 items-end max-w-2xl">
        <div className="flex-1">
          <label
            htmlFor="category-name"
            className="block text-base font-normal text-black mb-2"
          >
            Nombre de la categoría
          </label>
          <input
            type="text"
            id="category-name"
            name="name"
            value={formData}
            onChange={handleChange}
            placeholder="Ej: Verduras, Frutas, Lácteos..."
            required
            disabled={isSubmitting}
            className="w-full px-4 py-3 text-base border border-gray-300 focus:outline-none focus:border-black"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !formData.trim()}
          className="px-8 py-3 text-base font-normal text-white bg-black hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Agregando..." : "Agregar"}
        </button>
      </form>
    </div>
  );
}
