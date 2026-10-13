"use client";
import { getActiveListId, setActiveListId } from "@/app/lib/listClient";
import { listFetch } from "@/app/lib/listClient";
import { useState, useEffect, useRef } from "react";
import { ClipLoader } from "react-spinners";
import { RiDeleteBin6Line } from "react-icons/ri";
import Modal from "@/shared/components/ui/Modal";
import { completedPurchaseName } from "@/app/lib/completedPurchase";
import BoughtListModal from "./boughtModal";
import { IList } from "@/app/lib/types";
import UnitSelect from "@/shared/components/ui/UnitSelect";
import { compatibleUnits, type Unit } from "@/app/lib/units";
import SharedListControls from "./sharedListControls";
import { getHouseholdData } from "@/app/actions/households";
import { Category } from "@/app/lib/types";
import Select from "@/app/ui/add/select";

interface PendingProductUpdate {
  key: string;
  id: string;
  householdId?: string;
  cantidad: number;
  unit: Unit;
  version: number;
}

export default function List() {
  useEffect(() => {
    load();
  }, []);

  const [canEditList, setCanEditList] = useState(false);
  const [canManageList, setCanManageList] = useState(false);
  const [householdName, setHouseholdName] = useState("");
  const [isAddItemsOpen, setIsAddItemsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [list, setList] = useState<Record<string, IList[]>>({});
  const [listModal, setLisModal] = useState<IList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const revision = useRef(0);
  const submitting = useRef(false);
  const [purchaseConfirmation, setPurchaseConfirmation] = useState<{
    ids: string[];
    name: string;
    listId: string;
  } | null>(null);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [pendingSaveCount, setPendingSaveCount] = useState(0);
  const [isSavingEdits, setIsSavingEdits] = useState(false);
  const [autoSaveError, setAutoSaveError] = useState("");
  const pendingProductUpdates = useRef<Record<string, PendingProductUpdate>>(
    {},
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingEditsRef = useRef(false);

  useEffect(() => {
    const reload = () => {
      revision.current++;
      setLisModal(null);
      setPurchaseConfirmation(null);
      setIsAddItemsOpen(false);
      void load();
    };
    window.addEventListener("active-list-changed", reload);
    return () => window.removeEventListener("active-list-changed", reload);
  }, []);

  useEffect(() => {
    if (
      isLoading ||
      isAddItemsOpen ||
      listModal ||
      purchaseBusy ||
      purchaseConfirmation ||
      pendingSaveCount > 0 ||
      isSavingEdits
    )
      return;
    const refresh = () => {
      if (document.visibilityState === "visible")
        void Promise.all([fetchList(), fetchCategories()]).catch(() =>
          setError("No se pudo actualizar la lista compartida."),
        );
    };
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
    };
  }, [
    isLoading,
    isAddItemsOpen,
    listModal,
    pendingSaveCount,
    isSavingEdits,
    purchaseBusy,
    purchaseConfirmation,
  ]);

  async function load() {
    setIsLoading(true);
    setError("");
    try {
      const data = await getHouseholdData(getActiveListId());
      setActiveListId(data.household.id);
      setCanEditList(data.canEditList);
      setCanManageList(data.canManageList);
      setHouseholdName(data.household.name);
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

  function scheduleProductUpdate(
    product: IList,
    changes: { cantidad?: number; unit?: Unit },
  ) {
    const householdId = getActiveListId();
    const key = `${householdId ?? ""}:${product.id}`;
    const previous = pendingProductUpdates.current[key] ?? {
      key,
      id: product.id,
      householdId,
      cantidad: Number(product.cantidad),
      unit: product.unit ?? "un",
      version: 0,
    };
    pendingProductUpdates.current[key] = {
      ...previous,
      ...changes,
      version: previous.version + 1,
    };
    setPendingSaveCount(Object.keys(pendingProductUpdates.current).length);
    setAutoSaveError("");
    setError("");
    setStatus("Guardando cambios…");
    revision.current++;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void flushProductUpdates();
    }, 500);
  }

  async function flushProductUpdates() {
    if (isSavingEditsRef.current) return;
    const updates = Object.values(pendingProductUpdates.current);
    if (!updates.length) return;
    if (updates.some((update) => !Number.isFinite(update.cantidad) || update.cantidad <= 0)) {
      setStatus("Ingresa una cantidad mayor que cero para guardar los cambios.");
      return;
    }

    isSavingEditsRef.current = true;
    setIsSavingEdits(true);
    setAutoSaveError("");
    setStatus("Guardando cambios…");
    let succeeded = false;
    try {
      const byHousehold = new Map<string, PendingProductUpdate[]>();
      for (const update of updates) {
        const householdKey = update.householdId ?? "";
        const group = byHousehold.get(householdKey) ?? [];
        group.push(update);
        byHousehold.set(householdKey, group);
      }

      await Promise.all(
        [...byHousehold.entries()].map(async ([householdKey, group]) => {
          const response = await fetch("/api/list/update-multiple-products", {
            method: "PUT",
            headers: {
              "content-type": "application/json",
              ...(householdKey ? { "X-List-ID": householdKey } : {}),
            },
            body: JSON.stringify(
              group.map(({ id, cantidad, unit }) => ({
                id,
                cantidad,
                medida: 1,
                precio: 0,
                unit,
              })),
            ),
          });
          if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(
              result.error || "No pudimos guardar los cambios automáticamente.",
            );
          }
        }),
      );

      succeeded = true;
      for (const update of updates) {
        const latest = pendingProductUpdates.current[update.key];
        if (latest?.version === update.version)
          delete pendingProductUpdates.current[update.key];
      }
      setPendingSaveCount(Object.keys(pendingProductUpdates.current).length);
      setStatus(
        Object.keys(pendingProductUpdates.current).length
          ? "Guardando cambios…"
          : "Cambios guardados automáticamente.",
      );
    } catch (error) {
      setAutoSaveError(
        error instanceof Error
          ? error.message
          : "No pudimos guardar los cambios automáticamente.",
      );
      setStatus("");
    } finally {
      isSavingEditsRef.current = false;
      setIsSavingEdits(false);
      const hasPendingEdits =
        Object.keys(pendingProductUpdates.current).length > 0;
      if (succeeded && hasPendingEdits) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          saveTimer.current = null;
          void flushProductUpdates();
        }, 0);
      }
    }
  }

  function retryProductUpdates() {
    setAutoSaveError("");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void flushProductUpdates();
    }, 0);
  }

  const mutateCart = async (
    method: "DELETE" | "PATCH",
    target: { productId?: string; categoryId?: string; id?: string },
  ) => {
    if (
      !canEditList ||
      isLoading ||
      submitting.current ||
      purchaseConfirmation ||
      pendingSaveCount > 0
    )
      return;
    submitting.current = true;
    revision.current++;
    const mutationRevision = revision.current;
    const selectedListId = getActiveListId();
    setIsLoading(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/list/cart-items", {
        method,
        headers: {
          "content-type": "application/json",
          ...(selectedListId ? { "X-List-ID": selectedListId } : {}),
        },
        body: JSON.stringify(target),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "No pudimos actualizar el carrito.");
      }
      if (
        mutationRevision !== revision.current ||
        getActiveListId() !== selectedListId
      )
        return;
      const responseList = await fetch(
        "/api/list/get-list-products-by-categories",
        { headers: selectedListId ? { "X-List-ID": selectedListId } : {} },
      );
      if (!responseList.ok)
        throw new Error(
          "El cambio se guardó, pero no pudimos actualizar el carrito. Reintenta cargarlo.",
        );
      const updated: Record<string, IList[]> = await responseList.json();
      if (
        mutationRevision !== revision.current ||
        getActiveListId() !== selectedListId
      )
        return;
      setList(updated);
      setStatus(
        method === "PATCH"
          ? "Artículo desmarcado. Sigue pendiente en el carrito."
          : "Eliminado de este carrito. El catálogo se conserva.",
      );
    } catch (error) {
      if (mutationRevision !== revision.current) return;
      setError(
        error instanceof Error
          ? error.message
          : "No pudimos actualizar el carrito.",
      );
    } finally {
      submitting.current = false;
      if (mutationRevision === revision.current) setIsLoading(false);
    }
  };
  const removeItems = (
    target: { productId?: string; categoryId?: string },
    name: string,
  ) => {
    const message = target.categoryId
      ? `¿Eliminar la categoría ${name} de este carrito? Se eliminarán todos sus artículos de este carrito. La categoría y los productos del catálogo global y de otros carritos se conservan.`
      : `¿Eliminar ${name} de este carrito? El producto se conserva en el catálogo y en otros carritos.`;
    if (window.confirm(message)) void mutateCart("DELETE", target);
  };

  const handleOpenModal = (list: IList) => {
    if (
      !canEditList ||
      isLoading ||
      submitting.current ||
      purchaseConfirmation ||
      pendingSaveCount > 0
    )
      return;
    if (list.comprado === "1") {
      void mutateCart("PATCH", { id: list.id });
      return;
    }
    if (!canManageList) return;
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
    if (updateList) void fetchList();
  };

  const toggleCategoryVisibility = (categoryId: string) => {
    setVisibleCategories((prevVisibleCategories) => ({
      ...prevVisibleCategories,
      [categoryId]: !prevVisibleCategories[categoryId],
    }));
  };

  const openPurchaseConfirmation = async () => {
    if (!canManageList || submitting.current || pendingSaveCount > 0)
      return;
    const ids = Object.values(list)
      .flat()
      .filter((p) => p.comprado === "1")
      .map((p) => p.id);
    if (!ids.length) return;
    submitting.current = true;
    revision.current++;
    const confirmationRevision = revision.current;
    const selectedListId = getActiveListId();
    setPurchaseBusy(true);
    setError("");
    try {
      const data = await getHouseholdData(selectedListId);
      if (confirmationRevision !== revision.current) return;
      setPurchaseConfirmation({
        ids,
        name: data.household.name,
        listId: data.household.id,
      });
    } catch {
      setError("No pudimos preparar la compra parcial. Intenta nuevamente.");
    } finally {
      submitting.current = false;
      setPurchaseBusy(false);
    }
  };

  const clean = async () => {
    if (submitting.current || !purchaseConfirmation?.ids.length) return;
    submitting.current = true;
    revision.current++;
    setPurchaseBusy(true);
    setError("");
    setStatus("");
    try {
      // Pin the list confirmed in the modal, even if the active selection changes.
      const response = await fetch("/api/historical/add-historical", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-List-ID": purchaseConfirmation.listId,
        },
        body: JSON.stringify({ productIds: purchaseConfirmation.ids }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "No pudimos finalizar la compra parcial.",
        );
      setPurchaseConfirmation(null);
      if (getActiveListId() !== purchaseConfirmation.listId) return;
      setStatus(
        `Compra «${result.purchaseName}» guardada en el historial. Los pendientes siguen en el carrito activo.`,
      );
      await fetchList();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No pudimos finalizar la compra parcial. Intenta nuevamente.",
      );
    } finally {
      submitting.current = false;
      setPurchaseBusy(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    productId: string,
    categoryId: string,
    field: string,
  ) => {
    if (submitting.current) return;
    const { value } = e.target;
    if (field === "cantidad" && value === "") return;
    if (
      field === "cantidad" &&
      (!Number.isFinite(Number(value)) || Number(value) <= 0)
    ) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }
    revision.current++;
    setStatus("");
    setError("");
    const product = list[categoryId]?.find((item) => item.id === productId);

    setList((prevList) => {
      const updatedList = { ...prevList };
      updatedList[categoryId] = prevList[categoryId].map((product) =>
        product.id === productId ? { ...product, [field]: value } : product,
      );
      return updatedList;
    });
    if (product && field === "cantidad")
      scheduleProductUpdate(product, {
        cantidad: Number(value),
        unit: product.unit ?? "un",
      });
  };

  const products = Object.values(list).flat();
  const boughtCount = products.filter(
    (product) => product.comprado === "1",
  ).length;
  return (
    <div className="space-y-6">
      <SharedListControls onSwitch={load} />
      {!canEditList && (
        <p className="text-sm text-zinc-500">
          Tienes acceso como colaborador. Puedes sugerir cambios al final de la
          lista.
        </p>
      )}
      {canEditList && (
        <>
          <div className="panel flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">¿Falta algún producto?</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Se agregará a <strong>{householdName || "tu lista activa"}</strong>.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              aria-expanded={isAddItemsOpen}
              aria-controls="add-products-panel"
              disabled={isLoading || pendingSaveCount > 0 || isSavingEdits}
              onClick={() => setIsAddItemsOpen((open) => !open)}
            >
              {isAddItemsOpen ? "Cerrar" : "Agregar productos"}
            </button>
          </div>
          {pendingSaveCount > 0 && (
            <p className="text-sm text-zinc-500">
              Espera a que se guarden los cambios antes de agregar productos.
            </p>
          )}
          {isAddItemsOpen && (
            <section
              id="add-products-panel"
              className="panel"
              aria-label={`Agregar productos a ${householdName}`}
            >
              <Select
                listName={householdName}
                onAdded={async () => {
                  await Promise.all([fetchList(), fetchCategories()]);
                  setStatus(`Productos agregados a ${householdName}.`);
                  setIsAddItemsOpen(false);
                }}
              />
            </section>
          )}
        </>
      )}
      <p className="text-sm text-zinc-500">
        Finaliza la compra para guardar los productos comprados en el historial.
        Los cambios se guardan automáticamente; al volver a esta pestaña se
        sincroniza la lista compartida.
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
      {autoSaveError && (
        <div className="error-notice" role="alert">
          <p>{autoSaveError}</p>
          <button
            type="button"
            className="btn-secondary mt-3"
            disabled={isSavingEdits}
            onClick={retryProductUpdates}
          >
            Reintentar guardado
          </button>
        </div>
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
          <div className="flex flex-wrap gap-2">
            <button
              onClick={openPurchaseConfirmation}
              disabled={
                !canManageList ||
                purchaseBusy ||
                boughtCount === 0 ||
                pendingSaveCount > 0 ||
                isSavingEdits
              }
              className="btn-secondary"
            >
              Finalizar compra parcial
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
          <button
            type="button"
            className="btn-primary mt-6"
            onClick={() => setIsAddItemsOpen(true)}
          >
            Agregar productos
          </button>
        </div>
      )}
      {categories
        .filter((category) => list[category.id]?.length > 0)
        .map((category) => (
          <section
            key={category.id}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
          >
            <div className="flex items-center pr-4 sm:pr-6">
              <h2 className="min-w-0 flex-1">
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
              <button
                className="shrink-0 rounded-lg border border-zinc-300 px-2 py-1 text-xs"
                disabled={
                  !canEditList ||
                  isLoading ||
                  purchaseBusy ||
                  !!purchaseConfirmation ||
                  pendingSaveCount > 0
                }
                aria-label={`Eliminar categoría ${category.name} de este carrito`}
                onClick={() =>
                  removeItems({ categoryId: category.id }, category.name)
                }
              >
                Eliminar
              </button>
            </div>
            {visibleCategories[category.id] && (
              <div id={`category-${category.id}`}>
                <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_4rem_2.5rem] gap-2 border-y border-zinc-100 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-500 sm:grid-cols-[minmax(0,1fr)_3.5rem_4rem_2.5rem] sm:gap-2 sm:px-6">
                  <span>Producto</span>
                  <span className="text-center">Cantidad</span>
                  <span className="text-center">Unidad</span>
                </div>
                <ul className="divide-y divide-zinc-100">
                  {list[category.id].map((product) => (
                    <li
                      key={product.id}
                      className="grid grid-cols-[minmax(0,1fr)_3.5rem_4rem_2.5rem] items-center gap-2 px-4 py-2 sm:grid-cols-[minmax(0,1fr)_3.5rem_4rem_2.5rem] sm:gap-2 sm:px-6"
                    >
                      <button
                        disabled={
                          !canEditList ||
                          isLoading ||
                          purchaseBusy ||
                          !!purchaseConfirmation ||
                          pendingSaveCount > 0 ||
                          (product.comprado !== "1" && !canManageList)
                        }
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
                        {product.isProvisional && (
                          <span className="text-xs text-amber-700">
                            Provisional · agregado por {product.createdBy}
                            {product.catalogRequestEmail && (
                              <>
                                {" "}
                                · solicitud{" "}
                                {product.catalogRequestStatus === "approved"
                                  ? "aprobada"
                                  : product.catalogRequestStatus === "rejected"
                                    ? "rechazada"
                                    : "pendiente"}{" "}
                                de {product.catalogRequestEmail}
                              </>
                            )}
                          </span>
                        )}
                        <span className="sr-only">
                          {product.comprado === "1"
                            ? ", desmarcar comprado"
                            : ", registrar compra"}
                        </span>
                      </button>
                      <input
                        aria-label={`Cantidad de ${product.name}`}
                        className="h-10 min-w-0 w-full rounded-lg border border-zinc-300 px-1.5 text-center text-base tabular-nums focus:ring-2 focus:ring-zinc-400 sm:h-9 sm:text-sm"
                        type="number"
                        min="0"
                        step="any"
                        disabled={
                          !canEditList ||
                          isLoading ||
                          purchaseBusy ||
                          !!purchaseConfirmation ||
                          product.comprado === "1"
                        }
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
                        options={product.availableUnits ??
                          (product.comprado === "1"
                            ? [product.unit ?? "un"]
                            : compatibleUnits(product.productUnit ?? "un"))}
                        disabled={
                          !canEditList ||
                          isLoading ||
                          purchaseBusy ||
                          !!purchaseConfirmation ||
                          product.comprado === "1"
                        }
                        onChange={(unit: Unit) => {
                          if (submitting.current) return;
                          revision.current++;
                          setStatus("");
                          setError("");
                          setList((prev) => ({
                            ...prev,
                            [category.id]: prev[category.id].map((p) =>
                              p.id === product.id ? { ...p, unit } : p,
                            ),
                          }));
                          scheduleProductUpdate(product, {
                            cantidad: Number(product.cantidad),
                            unit,
                          });
                        }}
                      />
                      <button
                        type="button"
                        className="flex size-10 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={
                          !canEditList ||
                          isLoading ||
                          purchaseBusy ||
                          !!purchaseConfirmation ||
                          pendingSaveCount > 0
                        }
                        aria-label={`Eliminar ${product.name} de este carrito`}
                        onClick={() =>
                          removeItems({ productId: product.id }, product.name)
                        }
                        title={`Eliminar ${product.name} de este carrito`}
                      >
                        <RiDeleteBin6Line aria-hidden="true" size={20} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}
      {purchaseConfirmation && (
        <Modal
          isOpen
          title="Finalizar compra parcial"
          onClose={() => {
            if (!submitting.current) setPurchaseConfirmation(null);
          }}
        >
          <h2 className="text-xl font-semibold">Finalizar compra parcial</h2>
          <p className="mt-4">
            Los productos marcados como comprados (
            {purchaseConfirmation.ids.length}) se quitarán del carrito activo y
            se guardarán como una compra/lista terminada en el historial.
          </p>
          <p className="mt-3">
            Los productos sin marcar seguirán en el carrito, que conservará su
            nombre e identidad.
          </p>
          <p className="mt-3 break-words">
            Nombre en el historial:{" "}
            <strong>
              {completedPurchaseName(purchaseConfirmation.name, new Date())}
            </strong>
            . La fecha y hora corresponden a Buenos Aires y se fijan al
            confirmar.
          </p>
          {error && (
            <p role="alert" className="error-notice mt-4">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              className="btn-secondary"
              disabled={purchaseBusy}
              onClick={() => setPurchaseConfirmation(null)}
            >
              Cancelar
            </button>
            <button
              className="btn-primary"
              disabled={purchaseBusy}
              onClick={clean}
            >
              {purchaseBusy ? "Guardando…" : "Confirmar compra parcial"}
            </button>
          </div>
        </Modal>
      )}
      {canManageList && listModal && (
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
          availableUnits={listModal.availableUnits ?? [listModal.productUnit ?? "un"]}
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
