"use client";
import { useState, useEffect, SyntheticEvent } from "react";
import { ClipLoader } from "react-spinners";
import { capitalize } from "../../utils/capitalize";
import { RiDeleteBin6Line } from "react-icons/ri";
import DeleteProductModal from "./deleteProductModal";
import { BiEditAlt } from "react-icons/bi";
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
}

export interface NewProduct {
  name: string;
  idCategory: string;
}

export default function AddProduct() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategoy] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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
    void fetchProducts();
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
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las categorías",
      );
    } finally {
      setIsLoading(false);
    }
  }
  async function fetchProducts() {
    setError("");
    try {
      if (selectedCategory) {
        setIsLoading(true);
        const productsResponse = await fetch(
          "/api/products/get-products-by-category",
          {
            method: "POST",
            headers: {
              "Content-type": "application/json",
            },
            body: JSON.stringify({ id_category: selectedCategory }),
          },
        );
        if (!productsResponse.ok) {
          throw new Error("Error fetching productos by categories");
        }
        const productsData = await productsResponse.json();

        setProducts(productsData);
        setIsLoading(false);
      } else {
        setProducts([]);
        setIsLoading(false);
      }
    } catch {
      setError("No se pudieron cargar los productos. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleChange = (event: SyntheticEvent) => {
    const target = event.target as HTMLInputElement;
    const nameCategory = capitalize(target.value);
    setNewProductName(nameCategory);
  };

  const handleSubmit = async (event: React.ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    const product: NewProduct = {
      name: newProductName,
      idCategory: selectedCategory,
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

      await fetchProducts();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo agregar el producto",
      );
    }
  };

  const handleOpenEditModal = (product: Product) => {
    setEditModalProduct(product);
  };

  const handleCloseEditModal = async () => {
    await fetchProducts();
    setEditModalProduct(null);
  };

  const handleOpenDeleteModal = (product: Product) => {
    deleteEditModalProduct(product);
  };

  const handleCloseDeleteModal = async () => {
    await fetchProducts();
    deleteEditModalProduct(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {error && <p role="alert">{error}</p>}
      <h1 className="text-4xl font-normal text-black mb-12">
        Gestionar Productos
      </h1>

      <div className="mb-12 space-y-6">
        <div>
          <label className="block text-base font-normal text-black mb-3">
            Categoría
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategoy(e.target.value)}
            className="w-full max-w-xs px-4 py-3 text-base border border-gray-300 focus:outline-none focus:border-black bg-white"
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
        </div>

        <form onSubmit={handleSubmit} className="flex gap-4 items-end">
          <div className="flex-1 max-w-md">
            <label className="block text-base font-normal text-black mb-3">
              Nuevo Producto
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={newProductName}
              onChange={handleChange}
              placeholder="Nombre del producto"
              className="w-full px-4 py-3 text-base border border-gray-300 focus:outline-none focus:border-black"
            />
          </div>

          <button
            type="submit"
            disabled={!selectedCategory || !newProductName.trim()}
            className="px-8 py-3 text-base font-normal text-white bg-black hover:opacity-80 transition-opacity"
          >
            Agregar
          </button>
        </form>
      </div>

      <div className="space-y-1">
        {products.length === 0 && selectedCategory ? (
          <div className="text-center py-16">
            <p className="text-lg text-gray-600">
              No hay productos en esta categoría
            </p>
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between py-5 border-b border-gray-200 hover:opacity-70 transition-opacity"
            >
              <span className="text-base font-normal text-black">
                {product.name}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEditModal(product)}
                  className="p-2 text-gray-600 hover:text-black transition-colors"
                  title="Editar producto"
                >
                  <BiEditAlt size={20} />
                </button>
                {editModalProduct?.id === product.id && (
                  <EditProductModal
                    isOpen={!!editModalProduct}
                    onClose={handleCloseEditModal}
                    idProduct={product.id}
                    nameProduct={product.name}
                  />
                )}
                <button
                  onClick={() => handleOpenDeleteModal(product)}
                  className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                  title="Eliminar producto"
                >
                  <RiDeleteBin6Line size={20} />
                </button>
                {deleteModalProduct?.id === product.id && (
                  <DeleteProductModal
                    isOpen={!!deleteModalProduct}
                    onClose={handleCloseDeleteModal}
                    idProduct={product.id}
                    nameProduct={product.name}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <ClipLoader size={50} color={"#000000"} loading={isLoading} />
        </div>
      )}
    </div>
  );
}
