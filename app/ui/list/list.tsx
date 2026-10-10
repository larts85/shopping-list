"use client";
import { useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import BoughtListModal from "./boughtModal";
import { IList } from "@/app/lib/types";
import { Category } from "@/app/lib/types";

export default function List() {
  useEffect(() => {
    Promise.all([fetchList(), fetchCategories()])
      .catch(() => setError("No se pudo cargar la lista. Intentá nuevamente."))
      .finally(() => setIsLoading(false));
  }, []);

  const [categories, setCategories] = useState<Category[]>([]);
  const [list, setList] = useState<Record<string, IList[]>>({});
  const [listModal, setLisModal] = useState<IList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [visibleCategories, setVisibleCategories] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (categories.length > 0) {
      const initialVisibility = categories.reduce(
        (acc, category) => {
          acc[category.id] = true;
          return acc;
        },
        {} as Record<string, boolean>,
      );
      setVisibleCategories(initialVisibility);
    }
  }, [categories]);

  async function fetchCategories() {
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
  }

  async function fetchList() {
    const dataFechList = await fetch(
      "/api/list/get-list-products-by-categories",
      {
        method: "GET",
        headers: {
          "content-type": "application/json",
        },
      },
    );
    if (!dataFechList.ok) {
      throw new Error("Error fetching List");
    }
    const filteredProductListByCategories = await dataFechList.json();

    setList(filteredProductListByCategories);
  }
  const handleOpenModal = (list: IList) => {
    setLisModal(list);
  };

  const handleCloseModal = (updateList: IList | null) => {
    if (updateList) {
      setList((prevList) => {
        const updatedListProduct = { ...prevList };

        updatedListProduct[updateList.id_category] = prevList[
          updateList.id_category
        ].map((productList) => {
          return productList.id === updateList.id ? updateList : productList;
        });
        return updatedListProduct;
      });
    }
    setLisModal(null);
  };

  const toggleCategoryVisibility = (categoryId: string) => {
    setVisibleCategories((prevVisibleCategories) => ({
      ...prevVisibleCategories,
      [categoryId]: !prevVisibleCategories[categoryId],
    }));
  };

  const clean = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/historical/add-historical", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
      });
      if (!response.ok) throw new Error("No se pudo archivar la compra");
      await fetchList();
    } catch {
      setError("No se pudo limpiar la lista. Intentá nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    productId: string,
    categoryId: string,
    field: string,
  ) => {
    const { value } = e.target;

    setList((prevList) => {
      const updatedList = { ...prevList };
      updatedList[categoryId] = prevList[categoryId].map((product) =>
        product.id === productId ? { ...product, [field]: value } : product,
      );
      return updatedList;
    });
  };

  const save = async () => {
    setIsLoading(true);
    setError("");
    // Transformar el diccionario en un array de productos
    const productsToUpdate = Object.values(list)
      .flat()
      .map((product) => ({
        id: product.id,
        cantidad: parseFloat(product.cantidad),
        medida: parseFloat(product.medida),
        precio: 0,
      }));

    // Filtrar los productos que tengan valores en los campos 'cantidad' y 'medida'
    const changedProducts = productsToUpdate.filter((product) => {
      return product.cantidad > 0 && product.medida > 0;
    });

    // Llamar a la función updateMultipleProducts con los productos cambiados
    try {
      if (changedProducts.length > 0) {
        const response = await fetch("/api/list/update-multiple-products", {
          method: "PUT",
          body: JSON.stringify(changedProducts),
          headers: {
            "content-Type": "application/json",
          },
        });
        if (!response.ok) throw new Error("No se pudo guardar la lista");
        await fetchList();
      }
    } catch {
      setError("No se pudo guardar la lista. Intentá nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6">
      {error && <p role="alert">{error}</p>}
      {!isLoading && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={clean}
            className="rounded-lg px-4 py-2 text-sm font-medium text-black bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Limpiar
          </button>
          <button
            onClick={save}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-black hover:opacity-80 transition-opacity"
          >
            Guardar
          </button>
        </div>
      )}
      {categories
        .filter((category) => list[category.id] && list[category.id].length > 0)
        .map((category) => (
          <div key={category.id} className="mb-6">
            <h2
              className="text-lg font-medium text-black mb-3 cursor-pointer hover:opacity-70 transition-opacity flex items-center gap-2"
              onClick={() => toggleCategoryVisibility(category.id)}
            >
              <span className="text-lg">
                {visibleCategories[category.id] ? "▼" : "▶"}
              </span>
              {category.name}
            </h2>
            {visibleCategories[category.id] && (
              <div>
                {list[category.id]?.map((productList) => (
                  <div
                    className="flex items-center gap-3 py-2 border-b border-gray-200"
                    key={productList.id}
                  >
                    <div className="order-2 grid shrink-0 grid-cols-[3.5rem_4rem] gap-2">
                      <label
                        htmlFor={`quantity-${productList.id}`}
                        className="grid gap-1 text-xs font-medium text-gray-600"
                      >
                        Cantidad
                        <input
                          id={`quantity-${productList.id}`}
                          aria-label={`Cantidad de ${productList.name}`}
                          className="h-10 min-w-0 w-full rounded-lg px-1.5 text-center text-base tabular-nums border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black sm:h-9 sm:text-sm"
                          type="number"
                          value={productList.cantidad}
                          onChange={(e) =>
                            handleInputChange(
                              e,
                              productList.id,
                              category.id,
                              "cantidad",
                            )
                          }
                        />
                      </label>
                      <label
                        htmlFor={`measure-${productList.id}`}
                        className="grid gap-1 text-xs font-medium text-gray-600"
                      >
                        Medida
                        <input
                          id={`measure-${productList.id}`}
                          aria-label={`Medida de ${productList.name}`}
                          className="h-10 min-w-0 w-full rounded-lg px-1.5 text-center text-base tabular-nums border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black sm:h-9 sm:text-sm"
                          type="number"
                          value={productList.medida}
                          onChange={(e) =>
                            handleInputChange(
                              e,
                              productList.id,
                              category.id,
                              "medida",
                            )
                          }
                        />
                      </label>
                    </div>
                    <div
                      onClick={() => handleOpenModal(productList)}
                      className={`order-1 min-w-0 flex-1 break-words text-sm cursor-pointer ${
                        productList.comprado === "1"
                          ? "line-through text-gray-400"
                          : "text-black"
                      } hover:opacity-70 transition-opacity`}
                    >
                      {productList.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      {listModal && (
        <BoughtListModal
          isOpen={!!listModal}
          onClose={handleCloseModal}
          idList={listModal.id}
          nameProductList={listModal.name}
          idProduct={listModal.id_product}
          idCategory={listModal.id_category}
          cantidadp={listModal.cantidad}
          medidap={listModal.medida}
        />
      )}

      {isLoading && (
        <div className="flex justify-center items-center h-screen">
          <ClipLoader size={50} color={"#000000"} loading={isLoading} />
        </div>
      )}
    </div>
  );
}
