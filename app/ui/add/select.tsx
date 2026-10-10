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
  const allChecked = products.length > 0 && products.every((product) => product.checked);

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
    checked: boolean;
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
      const productsDataChecked = productsData.map((product: Omit<Product, "checked"> & { checked: string | boolean }) => ({
        ...product,
        checked: product.checked === "1" || product.checked === true,
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
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-normal text-black mb-8">Agregar Productos</h1>
        <div className="flex gap-4 items-start mb-12">
          <select
            value={selectedCategory}
            onChange={handleSelectChange}
            className="flex-1 max-w-xs px-4 py-3 text-base border border-gray-300 focus:outline-none focus:border-black bg-white"
          >
            {selectedCategory ? null : (
              <option value="">Seleccione una Categoría</option>
            )}
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <button
            onClick={createList}
            className="px-8 py-3 text-base font-normal text-white bg-black hover:opacity-80 transition-opacity"
          >
            Agregar a la lista
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {products.length > 0 ? (
          <div className="mb-8 pb-6 border-b border-gray-200">
            <label className="flex items-center gap-4 cursor-pointer">
              <input
                className="w-5 h-5 border-gray-300 focus:ring-black cursor-pointer"
                type="checkbox"
                checked={allChecked}
                onChange={handleAllChecked}
              />
              <span className="text-base font-normal text-black">
                Seleccionar Todo
              </span>
            </label>
          </div>
        ) : (
          selectedCategory && (
            <div className="text-center py-16">
              <p className="text-lg text-gray-600">No hay productos en esta categoría</p>
            </div>
          )
        )}

        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="py-4 border-b border-gray-200">
              <label className="flex items-center gap-4 cursor-pointer">
                <input
                  className="w-5 h-5 border-gray-300 focus:ring-black cursor-pointer"
                  id={product.id}
                  type="checkbox"
                  onChange={handleCheckboxChange}
                  checked={product.checked}
                />
                <span className={`text-base ${product.checked ? 'text-gray-400 line-through' : 'text-black'}`}>
                  {product.name}
                </span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <ClipLoader size={50} color={"#000000"} loading={isLoading} />
        </div>
      )}
    </div>
  );
}
