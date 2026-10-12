"use client";
import { listFetch } from "@/app/lib/listClient";
import { unitLabels, type Unit } from "@/app/lib/units";
import { useState, useEffect, useRef, SyntheticEvent } from "react";
import { ClipLoader } from "react-spinners";
import { Category } from "@/app/lib/types";
import BulkPaste from "./bulkPaste";

interface SelectProps {
  listName: string;
  onAdded: () => Promise<void>;
}

export default function Select({ listName, onAdded }: SelectProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<"category" | "bulk">("category");
  const [selectedCategory, setSelectedCategoy] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const productRequest = useRef(0);
  const selectedCount = products.filter((product) => product.checked).length;
  const allChecked = products.length > 0 && selectedCount === products.length;

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;
    setIsLoading(true);
    setError("");
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
      setCategories(categoriesData);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setError(
        "No pudimos cargar las categorías. Recarga la página para intentar nuevamente.",
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

  async function fetchProducts() {
    if (!selectedCategory) return;
    const requestId = ++productRequest.current;
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
      if (requestId !== productRequest.current) return;
      setProducts(
        data.map(
          (
            product: Omit<Product, "checked"> & { checked: string | boolean },
          ) => ({
            ...product,
            checked: product.checked === "1" || product.checked === true,
          }),
        ),
      );
    } catch {
      if (requestId === productRequest.current)
        setError("No pudimos cargar los productos. Intenta nuevamente.");
    } finally {
      if (requestId === productRequest.current) setIsLoading(false);
    }
  }

  const handleSelectChange = (event: SyntheticEvent) => {
    const target = event.target as HTMLSelectElement;
    setSelectedCategoy(target.value);
  };

  const handleAllChecked = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (isUpdating) return;
    const previousProducts = products;
    setIsUpdating(true);
    setError("");
    const checked = event.target.checked;

    const allcheckedProducts = products.map((product) => ({
      ...product,
      checked: checked,
    }));

    setProducts(allcheckedProducts);

    try {
      const productsResponse = await listFetch(
        "/api/products/edit-checked-products",
        {
          method: "PUT",
          headers: {
            "Content-type": "application/json",
          },
          body: JSON.stringify(allcheckedProducts),
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

  const handleCheckboxChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (isUpdating) return;
    const previousProducts = products;
    setIsUpdating(true);
    setError("");
    const productId = event.target.id;
    const isChecked = event.target.checked;

    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        String(product.id) === productId
          ? { ...product, checked: isChecked }
          : product,
      ),
    );

    const productChecked = {
      idProduct: productId,
      checked: event.target.checked,
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
          onClick={() => setMode("bulk")}
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
          products={products}
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
                  selectedCategory ? fetchProducts() : fetchCategories();
                }}
              >
                Reintentar
              </button>
            </div>
          )}
          <div className="panel flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <label className="w-full text-sm font-medium sm:max-w-sm">
              Categoría
              <select
                value={selectedCategory}
                onChange={handleSelectChange}
                className="field mt-2"
                disabled={isUpdating}
              >
                <option value="" disabled>
                  Selecciona una categoría
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={createList}
              disabled={isLoading || isUpdating || !selectedCategory}
              className="btn-primary"
            >
              Agregar a mi lista
            </button>
          </div>
          {!selectedCategory && !isLoading && !error && (
            <div className="empty-state">
              <p className="font-semibold text-zinc-900">
                Empecemos por una categoría.
              </p>
              <p className="mt-2">
                Selecciona una opción para ver tus productos habituales.
              </p>
            </div>
          )}
          {!isLoading && products.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-4">
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
                  <input
                    ref={(input) => {
                      if (input)
                        input.indeterminate = selectedCount > 0 && !allChecked;
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
                {products.map((product) => (
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
          )}
          {selectedCategory &&
            !isLoading &&
            !error &&
            products.length === 0 && (
              <div className="empty-state">
                Todavía no hay productos en esta categoría. Puedes agregarlos
                desde Administración.
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
