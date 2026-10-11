"use client";
import { getActiveListId, setActiveListId } from "@/app/lib/listClient";
import { listFetch } from "@/app/lib/listClient";
import { useState, useEffect, useRef } from "react";
import { ClipLoader } from "react-spinners";
import BoughtListModal from "./boughtModal";
import { IList } from "@/app/lib/types";
import UnitSelect from "@/shared/components/ui/UnitSelect";
import { compatibleUnits, type Unit } from "@/app/lib/units";
import SharedListControls from "./sharedListControls";
import Suggestions from "./suggestions";
import { getHouseholdData } from "@/app/actions/households";
import { Category } from "@/app/lib/types";

export default function List() {
  useEffect(() => {
    load();
  }, []);

  const [canEditList, setCanEditList] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [list, setList] = useState<Record<string, IList[]>>({});
  const [listModal, setLisModal] = useState<IList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const revision = useRef(0);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const reload = () => {
      revision.current++;
      setDirty({});
      setLisModal(null);
      void load();
    };
    window.addEventListener("active-list-changed", reload);
    return () => window.removeEventListener("active-list-changed", reload);
  }, []);

  useEffect(() => {
    if (isLoading || listModal || Object.keys(dirty).length) return;
    const refresh = () => {
      if (document.visibilityState === "visible")
        void Promise.all([fetchList(), fetchCategories()]).catch(() =>
          setError("No se pudo actualizar la lista compartida."),
        );
    };
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [isLoading, listModal, dirty]);

  async function load() {
    setIsLoading(true);
    setError("");
    try {
      const data = await getHouseholdData(getActiveListId());
      setActiveListId(data.household.id);
      setCanEditList(data.canEditList);
      await Promise.all([fetchList(), fetchCategories()]);
    } catch {
      setError("No pudimos cargar tu lista. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  }
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
  }

  async function fetchList() {
    const startedAtRevision = revision.current;
    const dataFechList = await listFetch(
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

    if (startedAtRevision === revision.current)
      setList(filteredProductListByCategories);
  }
  const handleOpenModal = (list: IList) => {
    if (!canEditList) return;
    revision.current++;
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
    revision.current++;
    setLisModal(null);
    if (updateList) {
      setDirty((prev) => {
        const next = { ...prev };
        delete next[updateList.id];
        return next;
      });
      void fetchList();
    }
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
    setStatus("");
    try {
      const response = await listFetch("/api/historical/add-historical", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      if (!response.ok) throw new Error("Error cleaning list");
      await fetchList();
      setDirty({});
      setStatus(
        "Compra guardada en el historial. Los pendientes siguen en la lista.",
      );
    } catch {
      setError("No pudimos limpiar la lista. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    productId: string,
    categoryId: string,
    field: string,
  ) => {
    const { value } = e.target;
    if (
      field === "cantidad" &&
      value !== "" &&
      (!Number.isFinite(Number(value)) || Number(value) <= 0)
    ) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }
    revision.current++;
    setDirty((prev) => ({ ...prev, [productId]: true }));
    setStatus("");
    setError("");

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
    setStatus("");
    const changedProducts = Object.values(list)
      .flat()
      .filter((product) => dirty[product.id] && product.comprado !== "1")
      .map((product) => ({
        id: product.id,
        cantidad: Number(product.cantidad),
        medida: 1,
        precio: 0,
        unit: product.unit ?? "un",
      }));
    if (
      changedProducts.some(
        (p) => !Number.isFinite(p.cantidad) || p.cantidad <= 0,
      )
    ) {
      setError("Todas las cantidades editadas deben ser mayores que cero.");
      setIsLoading(false);
      return;
    }
    try {
      if (changedProducts.length === 0) {
        setError("Edita una cantidad o unidad antes de guardar.");
        return;
      }
      const response = await listFetch("/api/list/update-multiple-products", {
        method: "PUT",
        body: JSON.stringify(changedProducts),
        headers: { "content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Error saving list");
      await fetchList();
      setDirty({});
      setStatus("Cambios guardados.");
    } catch {
      setError("No pudimos guardar los cambios. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const products = Object.values(list).flat();
  const boughtCount = products.filter(
    (product) => product.comprado === "1",
  ).length;
  return (
    <div className="space-y-6">
      <SharedListControls
        onSwitch={async () => {
          setDirty({});
          await load();
        }}
      />
      {!canEditList && (
        <p className="text-sm text-zinc-500">
          Tienes acceso como colaborador. Puedes sugerir cambios al final de la
          lista.
        </p>
      )}
      <p className="text-sm text-zinc-500">
        Finaliza la compra para guardar los productos comprados en el historial.
        La lista compartida se actualiza cada 15 segundos cuando no hay cambios
        sin guardar.
      </p>
      {error && (
        <div className="error-notice" role="alert">
          <p>{error}</p>
          {products.length === 0 && (
            <button className="btn-secondary mt-3" onClick={load}>
              Reintentar
            </button>
          )}
        </div>
      )}
      {status && (
        <p role="status" className="text-sm text-zinc-600">
          {status}
        </p>
      )}
      {!isLoading && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-zinc-500">
            <span className="font-semibold text-zinc-900">
              {products.length}
            </span>{" "}
            {products.length === 1 ? "producto" : "productos"} · {boughtCount}{" "}
            {boughtCount === 1 ? "comprado" : "comprados"}
          </p>
          <div className="flex gap-2">
            <button
              onClick={clean}
              disabled={
                !canEditList || !products.some((p) => p.comprado === "1")
              }
              className="btn-secondary"
            >
              Finalizar compra
            </button>
            <button
              onClick={save}
              disabled={!canEditList || Object.keys(dirty).length === 0}
              className="btn-primary"
            >
              Guardar cambios
            </button>
          </div>
        </div>
      )}
      {!isLoading && !error && products.length === 0 && (
        <div className="empty-state">
          <p className="text-lg font-semibold text-zinc-900">
            Tu lista está lista para empezar.
          </p>
          <p className="mt-2">
            Agrega los productos que necesitas para tu próxima compra.
          </p>
          <a href="/logistic/add" className="btn-primary mt-6">
            Agregar productos
          </a>
        </div>
      )}
      {categories
        .filter((category) => list[category.id]?.length > 0)
        .map((category) => (
          <section
            key={category.id}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
          >
            <h2>
              <button
                className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-zinc-50 sm:px-6"
                onClick={() => toggleCategoryVisibility(category.id)}
                aria-expanded={!!visibleCategories[category.id]}
                aria-controls={`category-${category.id}`}
              >
                <span className="min-w-0 break-words font-semibold">
                  {category.name}
                  <span className="ml-3 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">
                    {list[category.id].length}
                  </span>
                </span>
                <span aria-hidden="true" className="text-zinc-400">
                  {visibleCategories[category.id] ? "−" : "+"}
                </span>
              </button>
            </h2>
            {visibleCategories[category.id] && (
              <div id={`category-${category.id}`}>
                <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_4rem] gap-2 border-y border-zinc-100 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-500 sm:grid-cols-[minmax(0,1fr)_3.5rem_4rem] sm:gap-2 sm:px-6">
                  <span>Producto</span>
                  <span className="text-center">Cantidad</span>
                  <span className="text-center">Unidad</span>
                </div>
                <ul className="divide-y divide-zinc-100">
                  {list[category.id].map((product) => (
                    <li
                      key={product.id}
                      className="grid grid-cols-[minmax(0,1fr)_3.5rem_4rem] items-center gap-2 px-4 py-2 sm:grid-cols-[minmax(0,1fr)_3.5rem_4rem] sm:gap-2 sm:px-6"
                    >
                      <button
                        disabled={!canEditList}
                        onClick={() => handleOpenModal(product)}
                        className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg text-left text-sm hover:text-zinc-500 sm:gap-3"
                      >
                        <span
                          aria-hidden="true"
                          className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${product.comprado === "1" ? "border-zinc-900 bg-zinc-900 text-xs text-white" : "border-zinc-300"}`}
                        >
                          {product.comprado === "1" ? "✓" : ""}
                        </span>
                        <span
                          className={`min-w-0 break-words ${product.comprado === "1" ? "text-zinc-500 line-through" : "font-medium"}`}
                        >
                          {product.name}
                        </span>
                        <span className="sr-only">
                          {product.comprado === "1"
                            ? ", comprado"
                            : ", registrar compra"}
                        </span>
                      </button>
                      <input
                        aria-label={`Cantidad de ${product.name}`}
                        className="h-10 min-w-0 w-full rounded-lg border border-zinc-300 px-1.5 text-center text-base tabular-nums focus:ring-2 focus:ring-zinc-400 sm:h-9 sm:text-sm"
                        type="number"
                        min="0"
                        step="any"
                        disabled={!canEditList || product.comprado === "1"}
                        value={product.cantidad}
                        onChange={(e) =>
                          handleInputChange(
                            e,
                            product.id,
                            category.id,
                            "cantidad",
                          )
                        }
                      />
                      <UnitSelect
                        compact
                        label={`Unidad de ${product.name}`}
                        value={product.unit ?? "un"}
                        options={
                          product.comprado === "1"
                            ? [product.unit ?? "un"]
                            : compatibleUnits(product.productUnit ?? "un")
                        }
                        disabled={!canEditList || product.comprado === "1"}
                        onChange={(unit: Unit) => {
                          revision.current++;
                          setDirty((prev) => ({ ...prev, [product.id]: true }));
                          setList((prev) => ({
                            ...prev,
                            [category.id]: prev[category.id].map((p) =>
                              p.id === product.id ? { ...p, unit } : p,
                            ),
                          }));
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}
      <Suggestions onChange={load} />
      {canEditList && listModal && (
        <BoughtListModal
          isOpen={!!listModal}
          onClose={handleCloseModal}
          idList={listModal.id}
          nameProductList={listModal.name}
          idProduct={listModal.id_product}
          idCategory={listModal.id_category}
          cantidadp={listModal.cantidad}
          unitp={listModal.unit ?? "un"}
          productUnit={listModal.productUnit ?? "un"}
        />
      )}
      {isLoading && (
        <div role="status" className="loading-state">
          <ClipLoader size={24} color="#3f3f46" loading={isLoading} />
          <span>Cargando tu lista…</span>
        </div>
      )}
    </div>
  );
}
