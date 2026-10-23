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
import type { Category, Product } from "@/app/lib/types";
import BulkPaste from "./bulkPaste";
import Autocomplete from "@/shared/components/ui/Autocomplete";
import UnitSelect from "@/shared/components/ui/UnitSelect";
import { RiAddLine, RiCloseLine, RiSubtractLine } from "react-icons/ri";

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

interface SelectProps {
  listName: string;
  existingProductIds: string[];
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onAdded: (status?: string, keepOpen?: boolean) => Promise<void>;
  onClose: () => void;
}

export default function Select({
  listName,
  existingProductIds,
  searchInputRef,
  onAdded,
  onClose,
}: SelectProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<"search" | "category" | "bulk">("search");
  const [selectedCategory, setSelectedCategoy] = useState<string>("");
  const [productSearch, setProductSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState("");
  const [addingProductId, setAddingProductId] = useState("");
  const [addedProductIds, setAddedProductIds] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
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
    const matchesSearch = normalizeSearch(product.name).includes(
      normalizeSearch(productSearch.trim()),
    );
    return matchesCategory && matchesSearch;
  });
  const searchMatches = searchQuery.trim()
    ? products
        .filter((product) =>
          normalizeSearch(product.name).includes(
            normalizeSearch(searchQuery.trim()),
          ),
        )
        .filter(
          (product) =>
            !existingProductIds.includes(product.id) &&
            !addedProductIds.includes(product.id),
        )
        .slice(0, 12)
    : [];

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
    setProductSearch("");
    setProvisionalUnit("un");
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    setSelectedCategoy(product.id_category);
    setProductSearch(product.name);
    if (!product.checked) void handleProductChecked(product.id, true);
  };

  const changeSearchQuantity = (productId: string, amount: number) => {
    setQuantities((previous) => ({
      ...previous,
      [productId]: Math.max(1, (previous[productId] ?? 1) + amount),
    }));
  };

  const addMatchingProduct = async (product: Product) => {
    if (addingProductId) return;
    setAddingProductId(product.id);
    setSearchError("");
    const unit = product.unit ?? "un";
    try {
      const response = await listFetch("/api/list/bulk-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            name: product.name,
            idCategory: product.id_category,
            cantidad: quantities[product.id] ?? 1,
            unit,
            availableUnits:
              product.availableUnits?.length
                ? product.availableUnits
                : compatibleUnits(unit),
          },
        ]),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "No pudimos agregar el producto.");
      }
      setAddedProductIds((previous) => [...previous, product.id]);
      await onAdded(`“${product.name}” se agregó a ${listName}.`, true);
    } catch (cause) {
      setSearchError(
        cause instanceof Error
          ? cause.message
          : "No pudimos agregar el producto.",
      );
    } finally {
      setAddingProductId("");
    }
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
      <div className="flex items-start justify-between gap-4">
        <div>
        <h2 className="text-lg font-semibold text-zinc-900">
          Agregar productos
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Se agregarán a <strong className="text-zinc-700">{listName}</strong>.
        </p>
        </div>
        <button
          type="button"
          className="icon-button shrink-0"
          aria-label="Cerrar selector de productos"
          onClick={onClose}
        >
          <RiCloseLine aria-hidden="true" size={20} />
        </button>
      </div>
      <div className="flex border-b border-zinc-200">
        <button
          type="button"
          onClick={() => setMode("search")}
          className={`min-h-11 border-b-2 px-5 py-2.5 text-sm font-medium transition-colors ${
            mode === "search"
              ? "border-zinc-900 font-semibold text-zinc-900"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Buscar producto
        </button>
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
      ) : mode === "search" ? (
        <div className="space-y-4">
          {error && (
            <div role="alert" className="error-notice">
              <p>{error}</p>
              <button
                type="button"
                className="btn-secondary mt-3"
                onClick={() => {
                  setError("");
                  setIsLoading(true);
                  void fetchCategories();
                }}
              >
                Reintentar
              </button>
            </div>
          )}
          <label
            htmlFor="catalog-product-search"
            className="block text-sm font-medium text-zinc-700"
          >
            Producto
          </label>
          <input
            ref={searchInputRef}
            id="catalog-product-search"
            type="search"
            className="field"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSearchError("");
            }}
            placeholder="Escribe el nombre del producto"
            autoComplete="off"
          />
          {searchError && (
            <p role="alert" className="error-notice">
              {searchError}
            </p>
          )}
          {isLoading ? (
            <div role="status" className="loading-state">
              <ClipLoader size={24} color="#3f3f46" loading />
              <span>Cargando productos…</span>
            </div>
          ) : error ? null : !searchQuery.trim() ? (
            <div className="empty-state">
              Escribe para ver coincidencias del catálogo.
            </div>
          ) : searchMatches.length > 0 ? (
            <ul className="max-h-80 divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200">
              {searchMatches.map((product) => {
                const quantity = quantities[product.id] ?? 1;
                const isAdding = addingProductId === product.id;
                return (
                  <li
                    key={product.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-zinc-900">
                        {product.name}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {categories.find(
                          (category) => category.id === product.id_category,
                        )?.name ?? "Producto"}
                        {" · "}
                        {unitLabels[product.unit ?? "un"]}
                      </p>
                    </div>
                    <div
                      className="flex shrink-0 items-center gap-1"
                      role="group"
                      aria-label={`Cantidad de ${product.name}`}
                    >
                      <button
                        type="button"
                        className="icon-button size-9"
                        aria-label={`Reducir cantidad de ${product.name}`}
                        disabled={quantity <= 1 || !!addingProductId}
                        onClick={() => changeSearchQuantity(product.id, -1)}
                      >
                        <RiSubtractLine aria-hidden="true" size={18} />
                      </button>
                      <span
                        className="min-w-6 text-center text-sm tabular-nums"
                        aria-live="polite"
                      >
                        {quantity}
                      </span>
                      <button
                        type="button"
                        className="icon-button size-9"
                        aria-label={`Aumentar cantidad de ${product.name}`}
                        disabled={!!addingProductId}
                        onClick={() => changeSearchQuantity(product.id, 1)}
                      >
                        <RiAddLine aria-hidden="true" size={18} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="icon-button size-10 shrink-0 text-zinc-900"
                      aria-label={`Agregar ${product.name} a ${listName}`}
                      disabled={!!addingProductId}
                      onClick={() => void addMatchingProduct(product)}
                    >
                      {isAdding ? (
                        <ClipLoader size={16} color="#3f3f46" loading />
                      ) : (
                        <RiAddLine aria-hidden="true" size={20} />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="empty-state">
              No encontramos productos disponibles para agregar con ese nombre.
              Puedes probar en la pestaña «Por categoría».
            </div>
          )}
        </div>
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
                }}
                onSelect={(option) => handleProductSelect(option.value)}
                placeholder="Busca un producto"
                disabled={isUpdating}
              />
            </div>
            <button
              onClick={createList}
              disabled={isLoading || isUpdating || selectedCount === 0}
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
