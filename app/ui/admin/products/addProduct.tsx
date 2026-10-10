"use client";
import { useState, useEffect, useRef, SyntheticEvent } from "react";
import { ClipLoader } from "react-spinners";
import { capitalize } from "../../utils/capitalize";
import { RiDeleteBin6Line } from "react-icons/ri";
import DeleteProductModal from "./deleteProductModal";
import { BiEditAlt } from "react-icons/bi";
import UnitSelect from "@/shared/components/ui/UnitSelect";
import { unitLabels, type Unit } from "@/app/lib/units";
import { suggestProductUnit } from "@/app/lib/productUnits";
import EditProductModal from "./editProductModal";
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
}

export interface NewProduct {
  name: string;
  idCategory: string;
  unit: Unit;
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
  const [unitChosen, setUnitChosen] = useState(false);
  const [newProductName, setNewProductName] = useState<string>("");
  const [editModalProduct, setEditModalProduct] = useState<Product | null>(
    null,
  );
  const [deleteModalProduct, deleteEditModalProduct] = useState<Product | null>(
    null,
  );

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;
    setIsLoading(true);
    setProducts([]);
    fetchProducts();
  }, [selectedCategory]);

  async function fetchCategories() {
    try {
      const categoriesRespone = await fetch("/api/categories/get-categories", {
        method: "GET",
        headers: {
          "content-type": "application/json",
        },
      });
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
      const response = await fetch("/api/products/get-products-by-category", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ id_category: selectedCategory }),
      });
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

  const handleChange = (event: SyntheticEvent) => {
    const target = event.target as HTMLInputElement;
    const nameCategory = capitalize(target.value);
    setNewProductName(nameCategory);
    if (!unitChosen)
      setUnit(
        suggestProductUnit(
          nameCategory,
          categories.find((c) => c.id === selectedCategory)?.name,
        ),
      );
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
    };
    try {
      const response = await fetch("/api/products/add-product", {
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

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="error-notice">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="panel grid gap-4 lg:grid-cols-2">
        <label className="text-sm font-medium">
          Categoría
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategoy(e.target.value);
              if (!unitChosen)
                setUnit(
                  suggestProductUnit(
                    newProductName,
                    categories.find((c) => c.id === e.target.value)?.name,
                  ),
                );
            }}
            className="field mt-2"
            disabled={isSubmitting}
            required
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
        <label className="text-sm font-medium">
          Nombre del producto
          <input
            type="text"
            name="name"
            value={newProductName}
            onChange={handleChange}
            placeholder="Ej.: Arroz, leche, jabón…"
            className="field mt-2"
            disabled={isSubmitting}
            required
          />
        </label>
        <label className="text-sm font-medium">
          Unidad de medida
          <UnitSelect
            value={unit}
            onChange={(value) => {
              setUnit(value);
              setUnitChosen(true);
            }}
            disabled={isSubmitting}
          />
        </label>
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
          <h2 className="border-b border-zinc-100 px-5 py-4 font-semibold">
            Productos{" "}
            <span className="ml-2 text-sm font-normal text-zinc-400">
              {products.length}
            </span>
          </h2>
          <ul className="divide-y divide-zinc-100">
            {products.map((product) => (
              <li
                key={product.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <span className="min-w-0 break-words text-sm font-medium">
                  {product.name}
                  <span className="ml-2 text-xs font-normal text-zinc-500">
                    {unitLabels[product.unit ?? "un"]}
                  </span>
                </span>
                <div className="flex shrink-0 gap-1">
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
