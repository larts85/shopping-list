"use client";
import { useState, useEffect, SyntheticEvent } from "react";
import { ClipLoader } from "react-spinners";
import { useRouter } from "next/navigation";
import { Category } from "@/app/lib/types";

export default function Select() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategoy] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allChecked, setAllChecked] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
    setIsLoading(true);
  }, [selectedCategory]);

  const router = useRouter();

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
      setCategories(categoriesData);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }
  interface Product {
    id: string;
    name: string;
    id_category: string;
    checked: any;
  }

  async function fetchProducts() {
    if (selectedCategory) {
      const productsResponse = await fetch(
        "/api/products/get-products-by-category",
        {
          method: "POST",
          headers: {
            "Content-type": "application/json",
          },
          body: JSON.stringify({ id_category: selectedCategory }),
        }
      );
      if (!productsResponse.ok) {
        throw new Error("Error fetching productos by categories");
      }
      const productsData = await productsResponse.json();
      const productsDataChecked = productsData.map((product: Product) => ({
        ...product,
        checked: product.checked === "1" ? true : false,
      }));

      setProducts(productsDataChecked);
      setIsLoading(false);
    }
  }

  const handleSelectChange = (event: SyntheticEvent) => {
    const target = event.target as HTMLSelectElement;
    setSelectedCategoy(target.value);
  };

  const handleAllChecked = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const checked = event.target.checked;

    const allcheckedProducts = products.map((product) => ({
      ...product,
      checked: checked,
    }));

    setProducts(allcheckedProducts);
    setAllChecked(checked);

    const productsResponse = await fetch(
      "/api/products/edit-checked-products",
      {
        method: "PUT",
        headers: {
          "Content-type": "application/json",
        },
        body: JSON.stringify(allcheckedProducts),
      }
    );
    if (!productsResponse.ok) {
      throw new Error("Error when changing the checked of the product");
    }
  };

  const handleCheckboxChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const productId = event.target.id;
    const isChecked = event.target.checked;

    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        String(product.id) === productId
          ? { ...product, checked: isChecked }
          : product
      )
    );

    const productChecked = {
      idProduct: productId,
      checked: event.target.checked,
    };

    const productsResponse = await fetch("/api/products/edit-checked-product", {
      method: "PUT",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify(productChecked),
    });
    if (!productsResponse.ok) {
      throw new Error("Error when changing the checked of the product");
    }
  };

  const createList = async () => {
    setIsLoading(true);
    await fetch("/api/list/add-list", {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
    });

    setIsLoading(false);
    router.push("/logistic");
  };

  return (
    <div className="space-y-6">
      <div className="panel flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <label className="w-full text-sm font-medium sm:max-w-sm">
          Categoría
          <select
            value={selectedCategory}
            onChange={handleSelectChange}
            className="field mt-2"
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
          disabled={isLoading}
          className="btn-primary"
        >
          Agregar a mi lista
        </button>
      </div>
      {!selectedCategory && !isLoading && (
        <div className="empty-state">
          <p className="font-semibold text-zinc-900">
            Empecemos por una categoría.
          </p>
          <p className="mt-2">
            Selecciona una opción para ver tus productos habituales.
          </p>
        </div>
      )}
      {products.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-4">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={handleAllChecked}
              />
              Seleccionar todos
            </label>
            <span className="text-xs text-zinc-500">
              {products.filter((product) => product.checked).length}{" "}
              seleccionados
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
                    checked={product.checked}
                  />
                  <span className="break-words">{product.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}
      {selectedCategory && !isLoading && products.length === 0 && (
        <div className="empty-state">
          Todavía no hay productos en esta categoría. Puedes agregarlos desde
          Administración.
        </div>
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
