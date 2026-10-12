"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipLoader } from "react-spinners";
import { RiDeleteBin6Line } from "react-icons/ri";
import { listFetch, getActiveListId } from "@/app/lib/listClient";
import { getHouseholdData } from "@/app/actions/households";
import {
  parseAndClassifyList,
  type ClassifiedItem,
} from "@/app/lib/itemClassification";
import type { Category, Product } from "@/app/lib/types";
import { units, unitLabels, type Unit } from "@/app/lib/units";

interface BulkPasteProps {
  categories: Category[];
  products?: Product[];
}

const PLACEHOLDER_EXAMPLE = `1-Control
2- Extensión
3- Cortador pastillas
4- Cortina de baño
5- Mantel p mesa
6- 2 Jgos sábanas contul
7-Machacador de ajos
8-Abridor p latas y botellas
9- Gavetero de 4 gavetas
10-Soga p tender
11- Escurridor de platos
12-Jarro mediano no esmaltado
13-Colador
14-Embudo
15-2 Almohadones grandes
16-Cubo`;

export default function BulkPaste({
  categories,
  products = [],
}: BulkPasteProps) {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [items, setItems] = useState<ClassifiedItem[]>([]);
  const [hasParsed, setHasParsed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedCount = items.filter((item) => item.selected).length;
  const allSelected = items.length > 0 && selectedCount === items.length;

  const handleAnalyze = () => {
    setError("");
    if (!rawText.trim()) {
      setError("Por favor ingresa o pega un listado de productos.");
      return;
    }

    const classified = parseAndClassifyList(rawText, categories, products);
    if (classified.length === 0) {
      setError(
        "No detectamos artículos válidos en el texto ingresado. Revisa el formato y vuelve a intentar.",
      );
      return;
    }

    setItems(classified);
    setHasParsed(true);
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: checked })));
  };

  const handleToggleItem = (index: number) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, selected: !item.selected } : item,
      ),
    );
  };

  const handleNameChange = (index: number, newName: string) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, name: newName } : item,
      ),
    );
  };

  const handleQuantityChange = (index: number, newQty: number) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, cantidad: newQty > 0 ? newQty : 1 } : item,
      ),
    );
  };

  const handleCategoryChange = (index: number, categoryId: string) => {
    const foundCat = categories.find((c) => c.id === categoryId);
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              categoryId,
              categoryName: foundCat ? foundCat.name : item.categoryName,
            }
          : item,
      ),
    );
  };

  const handleUnitChange = (index: number, unit: Unit) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, unit } : item)),
    );
  };

  const handleDeleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleReset = () => {
    setHasParsed(false);
    setError("");
  };

  const handleClearAll = () => {
    setRawText("");
    setItems([]);
    setHasParsed(false);
    setError("");
  };

  const handleAddToList = async () => {
    const selectedItems = items.filter((item) => item.selected);
    if (selectedItems.length === 0) {
      setError("Selecciona al menos un artículo para agregar.");
      return;
    }

    // Validate that names are not empty and categories are valid
    for (const item of selectedItems) {
      if (!item.name.trim()) {
        setError("Todos los artículos seleccionados deben tener un nombre.");
        return;
      }
      if (!item.categoryId) {
        setError(
          `El artículo "${item.name}" debe tener una categoría asignada.`,
        );
        return;
      }
    }

    setIsSubmitting(true);
    setError("");

    try {
      const payload = selectedItems.map((item) => ({
        name: item.name.trim(),
        idCategory: item.categoryId,
        quantity: item.quantity,
        unit: item.unit,
      }));

      const res = await listFetch("/api/list/bulk-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || "No pudimos agregar los artículos a tu lista.",
        );
      }

      const active = await getHouseholdData(getActiveListId());
      router.push(`/lists/${active.household.slug}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al procesar la lista.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="error-notice">
          <p>{error}</p>
        </div>
      )}

      {!hasParsed ? (
        <section aria-labelledby="bulk-paste-title" className="panel space-y-4">
          <div>
            <h2
              id="bulk-paste-title"
              className="text-lg font-semibold text-zinc-900"
            >
              Pegar listado de productos
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Escribe o pega una lista con un producto por línea. El sistema
              identificará los saltos de línea, removerá números o guiones al
              inicio y sugerirá la categoría para cada uno.
            </p>
          </div>

          <label
            htmlFor="raw-item-list"
            className="block text-sm font-medium text-zinc-700"
          >
            Listado de artículos
          </label>
          <textarea
            id="raw-item-list"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={PLACEHOLDER_EXAMPLE}
            rows={10}
            className="field min-h-48 font-mono text-sm leading-relaxed"
            disabled={isSubmitting}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-xs text-zinc-500">
              {rawText.trim()
                ? `${rawText.split(/\r?\n+/).filter((l) => l.trim()).length} líneas detectadas`
                : "Puedes pegar texto copiado de WhatsApp, notas o mensajes"}
            </span>

            <div className="flex items-center gap-2">
              {rawText && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="btn-secondary"
                  disabled={isSubmitting}
                >
                  Limpiar
                </button>
              )}
              <button
                type="button"
                onClick={handleAnalyze}
                className="btn-primary"
                disabled={!rawText.trim() || isSubmitting}
              >
                Clasificar artículos
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section aria-labelledby="preview-items-title" className="space-y-5">
          <div className="panel flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2
                id="preview-items-title"
                className="text-lg font-semibold text-zinc-900"
              >
                Revisión y confirmación de categorías
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Revisa las categorías sugeridas. Puedes modificar nombres,
                cantidades, unidades o categorías antes de añadir a tu lista.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="btn-secondary text-sm"
                disabled={isSubmitting}
              >
                Editar texto original
              </button>
              <button
                type="button"
                onClick={handleAddToList}
                className="btn-primary"
                disabled={isSubmitting || selectedCount === 0}
              >
                {isSubmitting ? (
                  <>
                    <ClipLoader size={16} color="#ffffff" loading={true} />
                    <span>Guardando…</span>
                  </>
                ) : (
                  `Agregar a mi lista (${selectedCount})`
                )}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-700">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => handleToggleSelectAll(e.target.checked)}
                  disabled={isSubmitting}
                  aria-label="Seleccionar o deseleccionar todos los artículos"
                />
                <span>Seleccionar todos</span>
              </label>

              <span className="text-xs text-zinc-500 font-medium">
                {selectedCount} de {items.length} seleccionados
              </span>
            </div>

            <ul className="divide-y divide-zinc-100">
              {items.map((item, idx) => (
                <li
                  key={idx}
                  className={`p-4 transition-colors ${
                    item.selected ? "bg-white" : "bg-zinc-50/60 opacity-60"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    {/* Checkbox */}
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => handleToggleItem(idx)}
                        disabled={isSubmitting}
                        aria-label={`Seleccionar ${item.name}`}
                      />
                    </div>

                    {/* Name input */}
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-xs font-medium text-zinc-500 sm:sr-only">
                        Producto
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleNameChange(idx, e.target.value)}
                        className="field text-sm"
                        placeholder="Nombre del producto"
                        disabled={isSubmitting || !item.selected}
                      />
                    </div>

                    {/* Quantity */}
                    <div className="w-24">
                      <label className="block text-xs font-medium text-zinc-500 sm:sr-only">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleQuantityChange(idx, Number(e.target.value))
                        }
                        className="field text-sm text-center"
                        disabled={isSubmitting || !item.selected}
                      />
                    </div>

                    {/* Unit */}
                    <div className="w-24">
                      <label className="block text-xs font-medium text-zinc-500 sm:sr-only">
                        Unidad
                      </label>
                      <select
                        value={item.unit}
                        onChange={(e) =>
                          handleUnitChange(idx, e.target.value as Unit)
                        }
                        className="field text-sm"
                        disabled={isSubmitting || !item.selected}
                      >
                        {units.map((u) => (
                          <option key={u} value={u}>
                            {unitLabels[u]}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Category */}
                    <div className="min-w-[160px] sm:w-48">
                      <label className="block text-xs font-medium text-zinc-500 sm:sr-only">
                        Categoría
                      </label>
                      <select
                        value={item.categoryId}
                        onChange={(e) =>
                          handleCategoryChange(idx, e.target.value)
                        }
                        className="field text-sm font-medium text-zinc-900"
                        disabled={isSubmitting || !item.selected}
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Delete action */}
                    <div>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(idx)}
                        disabled={isSubmitting}
                        className="icon-button text-red-600 hover:bg-red-50"
                        title="Eliminar artículo"
                        aria-label={`Eliminar ${item.name}`}
                      >
                        <RiDeleteBin6Line className="size-5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-zinc-200 bg-zinc-50 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-sm text-zinc-600">
                Se agregarán <strong>{selectedCount}</strong> productos a tu
                lista de compras.
              </span>
              <button
                type="button"
                onClick={handleAddToList}
                className="btn-primary w-full sm:w-auto"
                disabled={isSubmitting || selectedCount === 0}
              >
                {isSubmitting ? (
                  <>
                    <ClipLoader size={16} color="#ffffff" loading={true} />
                    <span>Guardando…</span>
                  </>
                ) : (
                  `Agregar a mi lista (${selectedCount})`
                )}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
