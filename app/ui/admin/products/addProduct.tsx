"use client";
import { listFetch } from "@/app/lib/listClient";
import { useState, useEffect, useRef } from "react";
import { ClipLoader } from "react-spinners";
import { capitalize } from "../../utils/capitalize";
import { RiDeleteBin6Line } from "react-icons/ri";
import DeleteProductModal from "./deleteProductModal";
import { BiEditAlt } from "react-icons/bi";
import UnitSelect from "@/shared/components/ui/UnitSelect";
import {
  compatibleUnits,
  unitAbbreviations,
  unitLabels,
  type Unit,
} from "@/app/lib/units";
import { suggestProductUnit } from "@/app/lib/productUnits";
import EditProductModal from "./editProductModal";
import AvailableUnitsField from "./availableUnitsField";
import Autocomplete from "@/shared/components/ui/Autocomplete";
import ActionMenu from "@/shared/components/ui/ActionMenu";
interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  id_category: string;
  checked: boolean;
  unit?: Unit;
  availableUnits?: Unit[];
}

export interface NewProduct {
  name: string;
  idCategory: string;
  unit: Unit;
  availableUnits: Unit[];
}

export default function AddProduct() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const productRequest = useRef(0);
  const [selectedCategory, setSelectedCategoy] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [unit, setUnit] = useState<Unit>("un");
  const [availableUnits, setAvailableUnits] = useState<Unit[]>(["un"]);
  const [unitChosen, setUnitChosen] = useState(false);
  const [newProductName, setNewProductName] = useState<string>("");
  const [editModalProduct, setEditModalProduct] = useState<Product | null>(
    null,
  );
  const [deleteModalProduct, deleteEditModalProduct] = useState<Product | null>(
    null,
  );
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkUnits, setBulkUnits] = useState<Unit[]>(["un"]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState("");

  const handleCategorySearchChange = (categoryId: string) => {
    setSelectedCategoy(categoryId);
    if (!categoryId) {
      setProducts([]);
      setSelectedProductIds([]);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;
    setBulkCategoryId(selectedCategory);
    setSelectedProductIds([]);
    setIsLoading(true);
    setProducts([]);
    fetchProducts();
  }, [selectedCategory]);

  async function fetchCategories() {
    try {
      const categoriesRespone = await listFetch(
        "/api/categories/get-categories",
        {
          method: "GET",
          headers: {
            "content-type": "application/json",
          },
        },
      );
      if (!categoriesRespone.ok) {
        throw new Error("Error fetching categories");
      }
      const categoriesData = await categoriesRespone.json();
      if (Array.isArray(categoriesData)) {
        setCategories(categoriesData);
      } else {
        console.error("Categories data is not an array:", categoriesData);
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setError(
        "No pudimos cargar las categorías. Recarga la página para intentar nuevamente.",
      );
      setIsLoading(false);
    }
  }
  async function fetchProducts() {
    if (!selectedCategory) return;
    const requestId = ++productRequest.current;
    setError("");
    try {
      const response = await listFetch(
        "/api/products/get-products-by-category",
        {
          method: "POST",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify({ id_category: selectedCategory }),
        },
      );
      if (!response.ok) throw new Error("Error fetching products");
      const data = await response.json();
      if (requestId === productRequest.current) setProducts(data);
    } catch {
      if (requestId === productRequest.current)
        setError(
          "No pudimos cargar los productos. Selecciona otra categoría o recarga la página.",
        );
    } finally {
      if (requestId === productRequest.current) setIsLoading(false);
    }
  }

  const handleChange = (value: string) => {
    const nameCategory = capitalize(value);
    setNewProductName(nameCategory);
    if (!unitChosen) {
      const suggestedUnit = suggestProductUnit(
        nameCategory,
        categories.find((c) => c.id === selectedCategory)?.name,
      );
      setUnit(suggestedUnit);
      setAvailableUnits(compatibleUnits(suggestedUnit));
    }
  };

  const handleSubmit = async (event: React.ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || !selectedCategory || !newProductName.trim()) return;
    setIsSubmitting(true);
    setError("");
    const product: NewProduct = {
      name: newProductName,
      idCategory: selectedCategory,
      unit,
      availableUnits,
    };
    try {
      const response = await listFetch("/api/products/add-product", {
        method: "POST",
        body: JSON.stringify(product),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Error adding product");
      }

      setNewProductName("");
      setUnit("un");
      setAvailableUnits(["un"]);
      setUnitChosen(false);

      await fetchProducts();
    } catch (error) {
      console.error("Error submitting form:", error);
      setError("No pudimos agregar el producto. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (product: Product) => {
    setEditModalProduct(product);
  };

  const handleCloseEditModal = async () => {
    setEditModalProduct(null);
    await fetchProducts();
  };

  const handleOpenDeleteModal = (product: Product) => {
    deleteEditModalProduct(product);
  };

  const handleCloseDeleteModal = async () => {
    deleteEditModalProduct(null);
    await fetchProducts();
  };

  async function runBulkEdit(payload: Record<string, unknown>) {
    if (!selectedProductIds.length || bulkBusy) return;
    setBulkBusy(true);
    setBulkError("");
    try {
      const response = await listFetch("/api/products/bulk-edit-products", {
        method: "PUT",
        body: JSON.stringify({ productIds: selectedProductIds, ...payload }),
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error || "No pudimos actualizar los productos.");
      setSelectedProductIds([]);
      await fetchProducts();
    } catch (error) {
      setBulkError(
        error instanceof Error
          ? error.message
          : "No pudimos actualizar los productos.",
      );
    } finally {
      setBulkBusy(false);
    }
  }

  function toggleProduct(id: string, checked: boolean) {
    setSelectedProductIds((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((selectedId) => selectedId !== id),
    );
  }

  const allProductsSelected =
    products.length > 0 &&
    products.every((product) => selectedProductIds.includes(product.id));

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="error-notice">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="panel grid gap-4 lg:grid-cols-2">
        <Autocomplete
          label="Categoría"
          value=""
          selectedValue={selectedCategory}
          selectedLabel={categories.find((c) => c.id === selectedCategory)?.name ?? ""}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          onChange={handleCategorySearchChange}
          onSelect={(option) => {
            handleCategorySearchChange(option.value);
            if (!unitChosen) {
              const suggestedUnit = suggestProductUnit(newProductName, option.label);
              setUnit(suggestedUnit);
              setAvailableUnits(compatibleUnits(suggestedUnit));
            }
          }}
          placeholder={isLoading ? "Cargando categorías…" : "Selecciona una categoría"}
          disabled={isSubmitting || isLoading}
          required
        />
        <Autocomplete
          label="Nombre del producto"
          value={newProductName}
          options={products.map((product) => ({
            value: product.id,
            label: product.name,
          }))}
          onChange={handleChange}
          onSelect={(option) => {
            setNewProductName(option.label);
            const product = products.find((item) => item.id === option.value);
            if (product) setEditModalProduct(product);
          }}
          placeholder="Ej.: Arroz, leche, jabón…"
          disabled={isSubmitting || !selectedCategory}
        />
        <label className="text-sm font-medium">
          Unidad de medida
          <UnitSelect
            value={unit}
            onChange={(value) => {
              setUnit(value);
              setAvailableUnits((current) =>
                current.includes(value) ? current : [...current, value],
              );
              setUnitChosen(true);
            }}
            disabled={isSubmitting}
          />
        </label>
        <div className="lg:col-span-2">
          <AvailableUnitsField
            selected={availableUnits}
            onChange={setAvailableUnits}
            requiredUnit={unit}
            disabled={isSubmitting}
          />
        </div>
        <p className="text-sm text-zinc-500 lg:col-span-2">
          Sugerimos la unidad según el producto. Usa kg/g para productos al
          peso, litros/ml para volumen y unidades para envases o paquetes. Ej.:
          queso sardo → kg; leche → litros; leche (caja 1 l) → unidades. Puedes
          cambiarla antes de guardar.
        </p>
        <div className="lg:col-span-2">
          <button
            type="submit"
            disabled={
              isSubmitting || !selectedCategory || !newProductName.trim()
            }
            className="btn-primary"
          >
            {isSubmitting ? "Agregando…" : "Agregar producto"}
          </button>
        </div>
      </form>
      {!isLoading && !error && !selectedCategory && (
        <div className="empty-state">
          Elige una categoría para consultar y editar sus productos.
        </div>
      )}
      {!isLoading && !error && selectedCategory && products.length === 0 && (
        <div className="empty-state">
          Esta categoría todavía no tiene productos. Agrega el primero con el
          formulario.
        </div>
      )}
      {!isLoading && products.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
            <h2 className="font-semibold">
              Productos{" "}
              <span className="ml-2 text-sm font-normal text-zinc-400">
                {products.length}
              </span>
            </h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allProductsSelected}
                disabled={bulkBusy}
                onChange={(event) =>
                  setSelectedProductIds(
                    event.target.checked
                      ? products.map((product) => product.id)
                      : [],
                  )
                }
              />
              Seleccionar todos
            </label>
          </div>
          {selectedProductIds.length > 0 && (
            <div className="space-y-4 border-b border-zinc-100 bg-zinc-50 p-5">
              <p className="text-sm font-medium">
                {selectedProductIds.length} productos seleccionados
              </p>
              {bulkError && (
                <p role="alert" className="error-notice">
                  {bulkError}
                </p>
              )}
              <div className="flex flex-wrap items-end gap-3">
                <Autocomplete
                  label="Cambiar categoría"
                  value=""
                  selectedValue={bulkCategoryId}
                  selectedLabel={categories.find((c) => c.id === bulkCategoryId)?.name ?? ""}
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  onChange={setBulkCategoryId}
                  onSelect={(option) => setBulkCategoryId(option.value)}
                  disabled={bulkBusy}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={bulkBusy}
                  onClick={() =>
                    void runBulkEdit({ idCategory: bulkCategoryId })
                  }
                >
                  Aplicar categoría
                </button>
              </div>
              <AvailableUnitsField
                selected={bulkUnits}
                onChange={setBulkUnits}
                disabled={bulkBusy}
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={bulkBusy || bulkUnits.length === 0}
                  onClick={() =>
                    void runBulkEdit({ availableUnits: bulkUnits })
                  }
                >
                  Aplicar unidades
                </button>
                <button
                  type="button"
                  className="btn-secondary text-red-700 hover:bg-red-50"
                  disabled={bulkBusy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `¿Eliminar ${selectedProductIds.length} productos del catálogo? No se borrarán las compras anteriores.`,
                      )
                    )
                      void runBulkEdit({ action: "delete" });
                  }}
                >
                  {bulkBusy ? "Actualizando…" : "Eliminar seleccionados"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={bulkBusy}
                  onClick={() => setSelectedProductIds([])}
                >
                  Limpiar selección
                </button>
              </div>
            </div>
          )}
          <ul className="divide-y divide-zinc-100">
            {products.map((product) => (
              <li
                key={product.id}
                className="flex items-center gap-3 px-5 py-3"
              >
                <input
                  type="checkbox"
                  aria-label={`Seleccionar ${product.name}`}
                  checked={selectedProductIds.includes(product.id)}
                  disabled={bulkBusy}
                  onChange={(event) =>
                    toggleProduct(product.id, event.target.checked)
                  }
                />
                <span className="min-w-0 break-words text-sm font-medium">
                  {product.name}
                  {(() => {
                    const available =
                      product.availableUnits ?? [product.unit ?? "un"];
                    return (
                      <span
                        className="ml-2 text-xs font-normal text-zinc-500"
                        title={available.map((unit) => unitLabels[unit]).join(" / ")}
                        aria-label={`Unidades disponibles: ${available
                          .map((unit) => unitLabels[unit])
                          .join(" / ")}`}
                      >
                        {available
                          .map((unit) => unitAbbreviations[unit])
                          .join(" / ")}
                      </span>
                    );
                  })()}
                </span>
                <div className="ml-auto hidden shrink-0 gap-1 md:flex">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Editar ${product.name}`}
                    onClick={() => handleOpenEditModal(product)}
                  >
                    <BiEditAlt size={20} />
                  </button>
                  <button
                    type="button"
                    className="icon-button hover:bg-red-50 hover:text-red-700"
                    aria-label={`Eliminar ${product.name}`}
                    onClick={() => handleOpenDeleteModal(product)}
                  >
                    <RiDeleteBin6Line size={18} />
                  </button>
                </div>
                <ActionMenu
                  label={`Acciones para ${product.name}`}
                  items={[
                    {
                      label: "Editar producto",
                      icon: BiEditAlt,
                      disabled: bulkBusy,
                      onSelect: () => handleOpenEditModal(product),
                    },
                    {
                      label: "Eliminar producto",
                      icon: RiDeleteBin6Line,
                      disabled: bulkBusy,
                      destructive: true,
                      onSelect: () => handleOpenDeleteModal(product),
                    },
                  ]}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      {editModalProduct && (
        <EditProductModal
          isOpen={!!editModalProduct}
          onClose={handleCloseEditModal}
          idProduct={editModalProduct.id}
          nameProduct={editModalProduct.name}
          unitProduct={editModalProduct.unit ?? "un"}
          availableUnitsProduct={
            editModalProduct.availableUnits ?? [editModalProduct.unit ?? "un"]
          }
          categories={categories}
          idCategory={editModalProduct.id_category}
        />
      )}
      {deleteModalProduct && (
        <DeleteProductModal
          isOpen={!!deleteModalProduct}
          onClose={handleCloseDeleteModal}
          idProduct={deleteModalProduct.id}
          nameProduct={deleteModalProduct.name}
        />
      )}
      {isLoading && (
        <div role="status" className="loading-state">
          <ClipLoader size={24} color="#3f3f46" loading={isLoading} />
          <span>Cargando productos…</span>
        </div>
      )}
    </div>
  );
}
