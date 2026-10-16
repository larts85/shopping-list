"use client";
import { listFetch } from "@/app/lib/listClient";
import {
  compatibleUnits,
  units,
  unitLabels,
  type Unit,
} from "@/app/lib/units";
import { useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import { Category } from "@/app/lib/types";
import BulkPaste from "./bulkPaste";
import Autocomplete from "@/shared/components/ui/Autocomplete";
import UnitSelect from "@/shared/components/ui/UnitSelect";

interface SelectProps {
  listName: string;
  onAdded: (status?: string) => Promise<void>;
}

export default function Select({ listName, onAdded }: SelectProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<"category" | "bulk">("category");
  const [selectedCategory, setSelectedCategoy] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [productSearch, setProductSearch] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [bulkProducts, setBulkProducts] = useState<Product[]>([]);
  const [isLoadingBulkProducts, setIsLoadingBulkProducts] = useState(false);
  const [bulkProductsLoaded, setBulkProductsLoaded] = useState(false);
  const [bulkProductsError, setBulkProductsError] = useState("");
  const [error, setError] = useState("");
  const [provisionalError, setProvisionalError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAddingProvisional, setIsAddingProvisional] = useState(false);
  const [provisionalUnit, setProvisionalUnit] = useState<Unit>("un");
  const visibleProducts = products.filter((product) => {
    const matchesCategory =
      !selectedCategory || product.id_category === selectedCategory;
    const matchesSearch = product.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
      .includes(
        productSearch
          .trim()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase(),
      );
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const [categoriesRespone, productsResponse] = await Promise.all([
        listFetch("/api/categories/get-categories", { method: "GET" }),
        listFetch("/api/products/get-products", { method: "GET" }),
      ]);
      if (!categoriesRespone.ok || !productsResponse.ok)
        throw new Error("Error fetching catalog");
      const categoriesData = await categoriesRespone.json();
      const productsData = await productsResponse.json();
      setCategories(categoriesData);
      setProducts(productsData);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching catalog:", error);
      setError(
        "No pudimos cargar el catálogo. Recarga la página para intentar nuevamente.",
      );
      setIsLoading(false);
    }
  }
  interface Product {
    id: string;
    name: string;
    id_category: string;
    checked: boolean;
    unit?: Unit;
  }

  const categoryProducts = products.filter(
    (product) => product.id_category === selectedCategory,
  );
  const selectionProducts = visibleProducts;
  const selectedCount = selectionProducts.filter(
    (product) => product.checked,
  ).length;
  const allChecked =
    selectionProducts.length > 0 &&
    selectedCount === selectionProducts.length;

  async function fetchBulkProducts() {
    if (bulkProductsLoaded || isLoadingBulkProducts) return;
    setIsLoadingBulkProducts(true);
    setBulkProductsError("");
    try {
      const response = await listFetch("/api/products/get-products", {
        method: "GET",
      });
      if (!response.ok) throw new Error("No pudimos cargar el catálogo.");
      setBulkProducts(await response.json());
      setBulkProductsLoaded(true);
    } catch {
      setBulkProductsError(
        "No pudimos cargar el catálogo para clasificar los productos existentes.",
      );
    } finally {
      setIsLoadingBulkProducts(false);
    }
  }

  const handleSelectChange = (categoryId: string) => {
    setSelectedCategoy(categoryId);
    setSelectedProductId("");
    setProductSearch("");
    setProvisionalUnit("un");
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    setSelectedCategoy(product.id_category);
    setSelectedProductId(product.id);
    setProductSearch(product.name);
    if (!product.checked) void handleProductChecked(product.id, true);
  };

  const addProvisionalProduct = async () => {
    const name = productSearch.trim();
    if (!name || !selectedCategory || visibleProducts.length > 0) return;
    setIsAddingProvisional(true);
    setProvisionalError("");
    try {
      const response = await listFetch("/api/list/bulk-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            name,
            idCategory: selectedCategory,
            cantidad: 1,
            unit: provisionalUnit,
            availableUnits: compatibleUnits(provisionalUnit),
          },
        ]),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "No pudimos agregar el producto.");
      }
      const result = await response.json().catch(() => null);
      await onAdded(
        result?.catalogRequests
          ? `“${name}” se agregó como provisional y se envió al catálogo para revisión.`
          : `“${name}” se agregó como provisional. No se pudo enviar la solicitud al catálogo.`,
      );
    } catch (error) {
      setProvisionalError(
        error instanceof Error
          ? error.message
          : "No pudimos agregar el producto.",
      );
    } finally {
      setIsAddingProvisional(false);
    }
  };

  const handleAllChecked = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (isUpdating) return;
    const previousProducts = products;
    setIsUpdating(true);
    setError("");
    const checked = event.target.checked;

    const selectionIds = new Set(selectionProducts.map((product) => product.id));
    const allcheckedProducts = products.map((product) =>
      selectionIds.has(product.id) ? { ...product, checked } : product,
    );

    setProducts(allcheckedProducts);

    try {
      const productsResponse = await listFetch(
        "/api/products/edit-checked-products",
        {
          method: "PUT",
          headers: {
            "Content-type": "application/json",
          },
          body: JSON.stringify(allcheckedProducts.filter((product) => selectionIds.has(product.id))),
        },
      );
      if (!productsResponse.ok) {
        throw new Error("Error when changing the checked of the product");
      }
    } catch {
      setProducts(previousProducts);
      setError("No pudimos guardar la selección. Intenta nuevamente.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleProductChecked = async (
    productId: string,
    isChecked: boolean,
  ) => {
    if (isUpdating) return;
    const previousProducts = products;
    setIsUpdating(true);
    setError("");

    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        String(product.id) === productId
          ? { ...product, checked: isChecked }
          : product,
      ),
    );

    const productChecked = {
      idProduct: productId,
      checked: isChecked,
    };

    try {
      const productsResponse = await listFetch(
        "/api/products/edit-checked-product",
        {
          method: "PUT",
          headers: {
            "Content-type": "application/json",
          },
          body: JSON.stringify(productChecked),
        },
      );
      if (!productsResponse.ok) {
        throw new Error("Error when changing the checked of the product");
      }
    } catch {
      setProducts(previousProducts);
      setError("No pudimos guardar la selección. Intenta nuevamente.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    void handleProductChecked(event.target.id, event.target.checked);

  const createList = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await listFetch("/api/list/add-list", {
        method: "POST",
        headers: {
          "Content-type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Error adding list");
      await onAdded();
    } catch {
      setError(
        "No pudimos agregar los productos a la lista. Intenta nuevamente.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">
          Agregar productos
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Se agregarán a <strong className="text-zinc-700">{listName}</strong>.
        </p>
      </div>
      <div className="flex border-b border-zinc-200">
        <button
          type="button"
          onClick={() => setMode("category")}
          className={`min-h-11 border-b-2 px-5 py-2.5 text-sm font-medium transition-colors ${
            mode === "category"
              ? "border-zinc-900 font-semibold text-zinc-900"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Por categoría
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("bulk");
            void fetchBulkProducts();
          }}
          className={`min-h-11 border-b-2 px-5 py-2.5 text-sm font-medium transition-colors ${
            mode === "bulk"
              ? "border-zinc-900 font-semibold text-zinc-900"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Pegar listado
        </button>
      </div>

      {mode === "bulk" ? (
        <BulkPaste
          categories={categories}
          products={bulkProducts}
          isLoadingProducts={isLoadingBulkProducts}
          productsError={bulkProductsError}
          onRetryLoadProducts={fetchBulkProducts}
          onAdded={onAdded}
        />
      ) : (
        <>
          {error && (
            <div role="alert" className="error-notice">
              <p>{error}</p>
              <button
                className="btn-secondary mt-3"
                onClick={() => {
                  setError("");
                  setIsLoading(true);
                  fetchCategories();
                }}
              >
                Reintentar
              </button>
            </div>
          )}
          <div className="panel flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-full sm:flex-1">
              <Autocomplete
                label="Categoría"
                value=""
                selectedValue={selectedCategory}
                selectedLabel={categories.find((category) => category.id === selectedCategory)?.name ?? ""}
                options={categories.map((category) => ({ value: category.id, label: category.name }))}
                onChange={handleSelectChange}
                onSelect={(option) => handleSelectChange(option.value)}
                placeholder={isLoading ? "Cargando categorías…" : "Selecciona una categoría"}
                disabled={isUpdating || isLoading}
              />
            </div>
            <div className="w-full sm:flex-1">
              <Autocomplete
                label="Producto"
                value={productSearch}
                options={products.map((product) => ({
                  value: product.id,
                  label: product.name,
                  description: categories.find((category) => category.id === product.id_category)?.name,
                }))}
                onChange={(value) => {
                  setProductSearch(value);
                  setSelectedProductId("");
                }}
                onSelect={(option) => handleProductSelect(option.value)}
                placeholder="Busca un producto"
                disabled={isUpdating || isLoading}
              />
            </div>
            <button
              onClick={createList}
              disabled={isLoading || isUpdating || (!selectedCategory && !selectedProductId)}
              className="btn-primary"
            >
              Agregar a mi lista
            </button>
          </div>
          {!selectedCategory && !productSearch && !isLoading && !error && (
            <div className="empty-state">
              <p className="font-semibold text-zinc-900">
                Empecemos por una categoría.
              </p>
              <p className="mt-2">
                Selecciona una opción para ver tus productos habituales.
              </p>
            </div>
          )}
          {!isLoading && (selectedCategory || productSearch) && products.length > 0 && (
            <>
              <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-4">
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
                    <input
                      ref={(input) => {
                        if (input)
                          input.indeterminate =
                            selectedCount > 0 && !allChecked;
                      }}
                      type="checkbox"
                      disabled={isUpdating}
                      checked={allChecked}
                      onChange={handleAllChecked}
                    />
                    Seleccionar todos
                  </label>
                  <span className="text-xs text-zinc-500">
                    {selectedCount}{" "}
                    {selectedCount === 1 ? "seleccionado" : "seleccionados"}
                  </span>
                </div>
                <ul className="divide-y divide-zinc-100">
                  {selectionProducts.map((product) => (
                    <li key={product.id}>
                      <label
                        className={`flex min-h-16 cursor-pointer items-center gap-3 px-5 py-4 text-sm transition-colors hover:bg-zinc-50 ${product.checked ? "bg-zinc-50 font-medium" : ""}`}
                      >
                        <input
                          id={product.id}
                          type="checkbox"
                          onChange={handleCheckboxChange}
                          disabled={isUpdating}
                          checked={product.checked}
                        />
                        <span className="wrap-break-word">
                          {product.name}
                          <span className="ml-2 text-xs text-zinc-500">
                            {unitLabels[product.unit ?? "un"]}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
              {visibleProducts.length === 0 && (
                <div className="empty-state">
                  No hay productos que coincidan con la búsqueda.
                </div>
              )}
            </>
          )}
          {selectedCategory &&
            !isLoading &&
            !error &&
            categoryProducts.length === 0 && (
              <div className="empty-state space-y-3">
                <p>
                  Todavía no hay productos en esta categoría. Puedes agregar
                  uno como provisional a este carrito.
                </p>
                <label className="mx-auto block w-full max-w-sm text-left text-sm font-medium">
                  Nombre del producto
                  <input
                    className="field mt-2"
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    maxLength={200}
                    placeholder="Escribe el nombre"
                    disabled={isAddingProvisional}
                  />
                </label>
              </div>
            )}
          {selectedCategory &&
            !isLoading &&
            !error &&
            productSearch.trim() &&
            visibleProducts.length === 0 && (
              <div className="panel flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  {provisionalError && (
                    <p role="alert" className="error-notice mb-3">
                      {provisionalError}
                    </p>
                  )}
                  <p className="font-medium">
                    Agregar “{productSearch.trim()}” como provisional
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Se añadirá al carrito en esta categoría y se enviará una
                    solicitud al catálogo general para revisión.
                  </p>
                  <UnitSelect
                    label="Unidad del producto"
                    value={provisionalUnit}
                    options={units}
                    onChange={setProvisionalUnit}
                    disabled={isAddingProvisional}
                  />
                </div>
                <button
                  type="button"
                  className="btn-primary shrink-0"
                  disabled={isAddingProvisional}
                  onClick={() => void addProvisionalProduct()}
                >
                  {isAddingProvisional ? "Agregando…" : "Agregar al carrito"}
                </button>
              </div>
            )}
          {isLoading && (
            <div role="status" className="loading-state">
              <ClipLoader size={24} color="#3f3f46" loading={isLoading} />
              <span>Cargando productos…</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

Select.displayName = 'Select';
