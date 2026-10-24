"use client";
import {
  clearActiveListId,
  getActiveListId,
  setActiveListId,
} from "@/app/lib/listClient";
import { listFetch } from "@/app/lib/listClient";
import { useState, useEffect, useRef, useId } from "react";
import { useRouter } from "next/navigation";
import { ClipLoader } from "react-spinners";
import {
  RiArrowLeftRightLine,
  RiDeleteBin6Line,
  RiErrorWarningLine,
  RiMore2Fill,
} from "react-icons/ri";
import { createPortal } from "react-dom";
import ActionMenu from "@/shared/components/ui/ActionMenu";
import Modal from "@/shared/components/ui/Modal";
import ConfirmModal from "@/shared/components/ui/ConfirmModal";
import { completedPurchaseName } from "@/app/lib/completedPurchase";
import { getPurchaseActionLabel } from "@/app/lib/purchaseAction";
import BoughtListModal from "./boughtModal";
import ProductDetailsModal from "./productDetailsModal";
import { IList } from "@/app/lib/types";
import UnitSelect from "@/shared/components/ui/UnitSelect";
import {
  compatibleUnits,
  requiresWholeQuantity,
  type Unit,
} from "@/app/lib/units";
import SharedListControls from "./sharedListControls";
import { getListData } from "@/app/actions/lists";
import { Category } from "@/app/lib/types";
import Select from "@/app/ui/add/select";

interface MoveTarget {
  id: string;
  name: string;
}

interface PendingProductUpdate {
  key: string;
  id: string;
   listId?: string;
  cantidad: number;
  unit: Unit;
  version: number;
}

function ProvisionalInfo({ description }: { description: string }) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hovering = useRef(false);
  const focused = useRef(false);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>();

  function show() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const tooltipWidth = Math.min(320, window.innerWidth - 16);
    setPosition({
      top:
        window.innerHeight - rect.bottom < 120 && rect.top > 120
          ? Math.max(8, rect.top - 112)
          : rect.bottom,
      left: Math.max(
        8,
        Math.min(rect.left, window.innerWidth - tooltipWidth - 8),
      ),
    });
    setOpen(true);
  }

  function scheduleClose() {
    if (pinned || hovering.current || focused.current) return;
    closeTimer.current = setTimeout(() => {
      if (!pinned && !hovering.current && !focused.current) setOpen(false);
    }, 150);
  }

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      setPinned(false);
      triggerRef.current?.focus();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Información del producto provisional"
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        className="flex size-8 shrink-0 touch-manipulation items-center justify-center rounded-full text-amber-700 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
        onMouseEnter={() => {
          hovering.current = true;
          show();
        }}
        onMouseLeave={() => {
          hovering.current = false;
          scheduleClose();
        }}
        onFocus={() => {
          focused.current = true;
          show();
        }}
        onBlur={() => {
          focused.current = false;
          scheduleClose();
        }}
        onClick={() => {
          if (pinned) {
            setPinned(false);
            setOpen(false);
          } else {
            setPinned(true);
            show();
          }
        }}
      >
        <RiErrorWarningLine aria-hidden="true" size={18} />
      </button>
      {open &&
        position &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            className="fixed z-50 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs leading-5 text-zinc-800 shadow-lg"
            style={{
              top: position.top,
              left: position.left,
              width: "min(20rem, calc(100vw - 1rem))",
            }}
            onMouseEnter={() => {
              hovering.current = true;
              if (closeTimer.current) clearTimeout(closeTimer.current);
            }}
            onMouseLeave={() => {
              hovering.current = false;
              scheduleClose();
            }}
          >
            {description}
          </div>,
          document.body,
        )}
    </>
  );
}

export default function List() {
  const router = useRouter();
  useEffect(() => {
    load();
  }, []);

  const [canEditList, setCanEditList] = useState(false);
  const [canManageList, setCanManageList] = useState(false);
  const [ listName, setListName] = useState("");
  const [isAddItemsOpen, setIsAddItemsOpen] = useState(false);
  const addProductSearchRef = useRef<HTMLInputElement>(null);
  const [movePrompt, setMovePrompt] = useState<{
    target: { itemId?: string; categoryId?: string };
    name: string;
  } | null>(null);
  const [removeConfirmation, setRemoveConfirmation] = useState<{
    target: { productId?: string; categoryId?: string };
    message: string;
  } | null>(null);
  const [moveTargets, setMoveTargets] = useState<MoveTarget[]>([]);
  const [moveDestination, setMoveDestination] = useState("");
  const [newMoveListName, setNewMoveListName] = useState("");
  const [moveBusy, setMoveBusy] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [list, setList] = useState<Record<string, IList[]>>({});
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>(
    {},
  );
  const [listModal, setLisModal] = useState<IList | null>(null);
  const [detailsModal, setDetailsModal] = useState<IList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const revision = useRef(0);
  const submitting = useRef(false);
  const [purchaseConfirmation, setPurchaseConfirmation] = useState<{
    ids: string[];
    isPartial: boolean;
    name: string;
    listId: string;
  } | null>(null);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [pendingSaveCount, setPendingSaveCount] = useState(0);
  const [isSavingEdits, setIsSavingEdits] = useState(false);
  const [autoSaveError, setAutoSaveError] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const pendingProductUpdates = useRef<Record<string, PendingProductUpdate>>(
    {},
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingEditsRef = useRef(false);

  useEffect(() => {
    const reload = () => {
      revision.current++;
      setLisModal(null);
      setDetailsModal(null);
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
      detailsModal ||
      purchaseBusy ||
      purchaseConfirmation ||
      pendingSaveCount > 0 ||
      isSavingEdits
    )
      return;
    const refresh = () => {
      if (
        document.visibilityState === "visible" &&
        Object.keys(pendingProductUpdates.current).length === 0 &&
        !isSavingEditsRef.current
      )
        void fetchPageData().catch(() =>
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
    detailsModal,
    pendingSaveCount,
    isSavingEdits,
    purchaseBusy,
    purchaseConfirmation,
  ]);

  async function load() {
    const startedAtRevision = revision.current;
    setIsLoading(true);
    setError("");
    try {
      const pageResponse = await listFetch("/api/list/page-data", {
        method: "GET",
      });
      if (!pageResponse.ok) throw new Error("Error fetching list data");
      const pageData = await pageResponse.json();
      if (startedAtRevision !== revision.current) return;
      setActiveListId(pageData.activeList.id);
      setCanEditList(pageData.canEditList);
      setCanManageList(pageData.canManageList);
      setListName(pageData.activeList.name);
      setList(pageData.list);
      setCategories(pageData.categories);
    } catch {
      if (startedAtRevision === revision.current)
        setError("No pudimos cargar tu lista. Intenta nuevamente.");
    } finally {
      if (startedAtRevision === revision.current) setIsLoading(false);
    }
  }
  const [visibleCategories, setVisibleCategories] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (categories.length > 0) {
      setVisibleCategories((current) => {
        let changed = false;
        const next = { ...current };
        for (const category of categories) {
          if (next[category.id] === undefined) {
            next[category.id] = true;
            changed = true;
          }
        }
        return changed ? next : current;
      });
    }
  }, [categories]);

  async function fetchPageData() {
    const startedAtRevision = revision.current;
    const response = await listFetch("/api/list/page-data", { method: "GET" });
    if (!response.ok) throw new Error("Error fetching list data");
    const data = await response.json();
    if (startedAtRevision !== revision.current) return;
    setList(data.list);
    setCategories(data.categories);
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

  async function openMovePrompt(
    target: { itemId?: string; categoryId?: string },
    name: string,
  ) {
    if (!canEditList || isLoading || pendingSaveCount > 0 || submitting.current)
      return;
    setError("");
    try {
      const response = await listFetch(
        "/api/list/cart-items?view=move-targets",
      );
      if (!response.ok)
        throw new Error("No pudimos cargar tus otros listados.");
      const targets: MoveTarget[] = await response.json();
      setMoveTargets(targets);
      setMoveDestination("");
      setNewMoveListName("");
      setMovePrompt({ target, name });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No pudimos cargar tus otros listados.",
      );
    }
  }

  async function performMove(targetListId: string) {
    if (!movePrompt) return;
    const selectedListId = getActiveListId();
    const response = await listFetch("/api/list/cart-items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...movePrompt.target, targetListId }),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "No pudimos mover los artículos.");
    setMovePrompt(null);
    if (getActiveListId() !== selectedListId) return;
    setStatus(
      `${result.moved} ${result.moved === 1 ? "artículo movido" : "artículos movidos"}${result.merged ? `; ${result.merged} duplicado${result.merged === 1 ? "" : "s"} combinado${result.merged === 1 ? "" : "s"} sumando cantidades` : ""}.`,
    );
    try {
      await fetchList();
    } catch {
      setError(
        "El movimiento se guardó, pero no pudimos actualizar el carrito.",
      );
    }
  }

  async function confirmMove(targetListId: string) {
    if (!movePrompt || moveBusy) return;
    setMoveBusy(true);
    setError("");
    submitting.current = true;
    try {
      await performMove(targetListId);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No pudimos mover los artículos.",
      );
    } finally {
      submitting.current = false;
      setMoveBusy(false);
    }
  }

  async function createAndMove() {
    if (!movePrompt || moveBusy) return;
    const name = newMoveListName.trim();
    if (!name) {
      setError("Escribe el nombre de la nueva lista.");
      return;
    }
    setMoveBusy(true);
    setError("");
    submitting.current = true;
    let createdName = "";
    try {
      const response = await listFetch("/api/lists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", name, activate: false }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "No pudimos crear la lista.");
      createdName = name;
      const newTarget = { id: result.result as string, name };
      setMoveTargets((targets) => [...targets, newTarget]);
      setMoveDestination(newTarget.id);
      await performMove(newTarget.id);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No pudimos mover los artículos.";
      setError(
        createdName
          ? `La lista «${createdName}» se creó, pero no se pudo completar el movimiento: ${message}`
          : message,
      );
    } finally {
      submitting.current = false;
      setMoveBusy(false);
    }
  }

  function scheduleProductUpdate(
    product: IList,
    changes: { cantidad?: number; unit?: Unit },
  ) {
    const  listId = getActiveListId();
    const key = `${ listId ?? ""}:${product.id}`;
    const previous = pendingProductUpdates.current[key] ?? {
      key,
      id: product.id,
       listId,
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
    if (
      updates.some(
        (update) =>
          !Number.isFinite(update.cantidad) ||
          update.cantidad <= 0 ||
          (requiresWholeQuantity(update.unit) &&
            !Number.isInteger(update.cantidad)),
      )
    ) {
      setStatus(
        "Ingresa una cantidad mayor que cero para guardar los cambios.",
      );
      return;
    }

    isSavingEditsRef.current = true;
    setIsSavingEdits(true);
    setAutoSaveError("");
    setStatus("Guardando cambios…");
    let succeeded = false;
    try {
      const byList = new Map<string, PendingProductUpdate[]>();
      for (const update of updates) {
        const  listKey = update. listId ?? "";
        const group = byList.get( listKey) ?? [];
        group.push(update);
        byList.set( listKey, group);
      }

      await Promise.all(
        [...byList.entries()].map(async ([ listKey, group]) => {
          const response = await fetch("/api/list/update-multiple-products", {
            method: "PUT",
            headers: {
              "content-type": "application/json",
              ...( listKey ? { "X-List-ID":  listKey } : {}),
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
    setRemoveConfirmation({ target, message });
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

  const handleCloseDetailsModal = (updatedItem: IList | null) => {
    if (updatedItem) {
      setList((prevList) => ({
        ...prevList,
        [updatedItem.id_category]: (
          prevList[updatedItem.id_category] ?? []
        ).map((product) =>
          product.id === updatedItem.id ? updatedItem : product,
        ),
      }));
      setStatus("Detalles del producto guardados.");
    }
    revision.current++;
    setDetailsModal(null);
    if (updatedItem) void fetchList();
  };

  const openDetailsModal = (product: IList) => {
    if (
      !canEditList ||
      isLoading ||
      purchaseBusy ||
      purchaseConfirmation ||
      pendingSaveCount > 0
    )
      return;
    setDetailsModal(product);
  };

  const toggleCategoryVisibility = (categoryId: string) => {
    setVisibleCategories((prevVisibleCategories) => ({
      ...prevVisibleCategories,
      [categoryId]: !prevVisibleCategories[categoryId],
    }));
  };

  const openPurchaseConfirmation = async () => {
    if (!canManageList || submitting.current || pendingSaveCount > 0) return;
    const ids = Object.values(list)
      .flat()
      .filter((p) => p.comprado === "1")
      .map((p) => p.id);
    if (!ids.length) return;
    const isPartial = ids.length < Object.values(list).flat().length;
    submitting.current = true;
    revision.current++;
    const confirmationRevision = revision.current;
    const selectedListId = getActiveListId();
    setPurchaseBusy(true);
    setError("");
    try {
      const data = await getListData(selectedListId);
      if (confirmationRevision !== revision.current) return;
      setPurchaseConfirmation({
        ids,
        isPartial,
        name: data. list.name,
        listId: data. list.id,
      });
    } catch {
      setError("No pudimos preparar la compra parcial. Intenta nuevamente.");
    } finally {
      submitting.current = false;
      setPurchaseBusy(false);
    }
  };

  async function applyBulkAction(action: "remove" | "buy" | "description") {
    if (!selectedIds.length) return;
    const description = action === "description" ? window.prompt("Descripción (reemplazará las existentes):", "") : undefined;
    if (action === "description" && description === null) return;
    if (action === "remove" && !window.confirm(`¿Eliminar ${selectedIds.length} artículos del carrito?`)) return;
    const response = await listFetch("/api/list/bulk", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: selectedIds, action, description }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No pudimos aplicar la acción.");
    setSelectedIds([]); setSelectionMode(false); await fetchList();
    setStatus(action === "buy" ? "Artículos marcados como comprados." : action === "remove" ? "Artículos eliminados del carrito." : "Descripción actualizada.");
  }

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
      if (result.completed) {
        clearActiveListId();
        router.push("/history");
        return;
      }
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
  const purchaseActionLabel = getPurchaseActionLabel(products);
  return (
    <div className="space-y-6">
      <SharedListControls onSwitch={load} />
      {!canEditList && (
        <p className="text-sm text-zinc-500">
          Tienes acceso de solo lectura a esta lista.
        </p>
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
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">
              <span className="font-semibold text-zinc-900">
                {products.length}
              </span>{" "}
              {products.length === 1 ? "producto" : "productos"} · {boughtCount}{" "}
              {boughtCount === 1 ? "comprado" : "comprados"}
            </p>
            <div className="flex flex-wrap gap-2">
              {canEditList && (
                <button
                  type="button"
                  className="btn-primary"
                  aria-expanded={isAddItemsOpen}
                  aria-controls="add-products-panel"
                  disabled={
                    isLoading || pendingSaveCount > 0 || isSavingEdits
                  }
                  onClick={() => setIsAddItemsOpen((open) => !open)}
                >
                  {isAddItemsOpen ? "Cerrar" : "Agregar productos"}
                </button>
              )}
              {canEditList && (
                <button type="button" className={selectionMode ? "btn-primary" : "btn-secondary"} onClick={() => { setSelectionMode((v) => !v); setSelectedIds([]); }}>
                  {selectionMode ? "Cancelar selección" : "Seleccionar"}
                </button>
              )}
              <button
                type="button"
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
                {purchaseActionLabel}
              </button>
            </div>
          </div>
          {selectionMode && selectedIds.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <span className="mr-2 text-sm font-medium">{selectedIds.length} seleccionados</span>
              <button className="btn-secondary" onClick={() => void applyBulkAction("buy")}>Marcar comprados</button>
              <button className="btn-secondary" onClick={() => void applyBulkAction("description")}>Agregar descripción</button>
              <button className="btn-secondary text-red-700" onClick={() => void applyBulkAction("remove")}>Eliminar</button>
              <button className="btn-secondary" onClick={async () => { const target = window.prompt("ID de la lista de destino:"); if (!target) return; const response = await listFetch("/api/list/cart-items", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetListId: target, itemIds: selectedIds }) }); const result = await response.json(); if (!response.ok) { setError(result.error || "No pudimos mover los artículos."); return; } setSelectedIds([]); setSelectionMode(false); await fetchList(); setStatus(`${result.moved} artículos movidos.`); }}>Mover a otra lista</button>
              <button className="btn-secondary" onClick={() => { const ids = selectedIds; setSelectionMode(false); setPurchaseConfirmation({ ids, isPartial: true, name:  listName, listId: getActiveListId() || "" }); }}>Finalizar compra parcial</button>
            </div>
          )}
          {canEditList && pendingSaveCount > 0 && (
            <p className="mt-3 text-sm text-zinc-500">
              Espera a que se guarden los cambios antes de agregar productos.
            </p>
          )}
          {canEditList && isAddItemsOpen && (
            <Modal
              isOpen
              title="Agregar productos"
              size="xl"
              initialFocusRef={addProductSearchRef}
              onClose={() => setIsAddItemsOpen(false)}
            >
              <Select
                listName={ listName}
                existingProductIds={products
                  .map((product) => product.id_product)
                  .filter((id): id is string => !!id)}
                searchInputRef={addProductSearchRef}
                onClose={() => setIsAddItemsOpen(false)}
                onAdded={async (message, keepOpen) => {
                  await fetchPageData();
                  setStatus(
                    message ?? `Productos agregados a ${ listName}.`,
                  );
                  if (!keepOpen) setIsAddItemsOpen(false);
                }}
              />
            </Modal>
          )}
          {!canManageList && boughtCount > 0 && (
            <p className="mt-3 text-sm text-zinc-500">
              Solo el propietario puede finalizar la compra. Los productos
              marcados como comprados seguirán en esta lista y no aparecerán en
              Historial hasta que el propietario la finalice.
            </p>
          )}
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
              <div className="hidden shrink-0 items-center gap-2 md:flex">
                <button
                  type="button"
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    !canEditList ||
                    isLoading ||
                    purchaseBusy ||
                    !!purchaseConfirmation ||
                    pendingSaveCount > 0
                  }
                  onClick={() =>
                    removeItems({ categoryId: category.id }, category.name)
                  }
                >
                  Eliminar
                </button>
                <button
                  type="button"
                  className="flex size-10 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    !canEditList ||
                    isLoading ||
                    purchaseBusy ||
                    !!purchaseConfirmation ||
                    pendingSaveCount > 0
                  }
                  aria-label={`Mover los artículos de ${category.name} a otro listado`}
                  onClick={() =>
                    void openMovePrompt(
                      { categoryId: category.id },
                      category.name,
                    )
                  }
                  title={`Mover los artículos de ${category.name} a otro listado`}
                >
                  <RiArrowLeftRightLine aria-hidden="true" size={18} />
                </button>
              </div>
              <ActionMenu
                label={`Acciones para la categoría ${category.name}`}
                items={[
                  {
                    label: "Mover artículos a otra lista",
                    icon: RiArrowLeftRightLine,
                    disabled:
                      !canEditList ||
                      isLoading ||
                      purchaseBusy ||
                      !!purchaseConfirmation ||
                      pendingSaveCount > 0,
                    onSelect: () =>
                      void openMovePrompt(
                        { categoryId: category.id },
                        category.name,
                      ),
                  },
                  {
                    label: "Eliminar categoría del carrito",
                    icon: RiDeleteBin6Line,
                    destructive: true,
                    disabled:
                      !canEditList ||
                      isLoading ||
                      purchaseBusy ||
                      !!purchaseConfirmation ||
                      pendingSaveCount > 0,
                    onSelect: () =>
                      removeItems({ categoryId: category.id }, category.name),
                  },
                ]}
              />
            </div>
            {visibleCategories[category.id] && (
              <div id={`category-${category.id}`}>
                <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_4rem_2.5rem] gap-2 border-y border-zinc-100 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-500 sm:grid-cols-[minmax(0,1fr)_3.5rem_4rem_2.5rem] sm:gap-2 sm:px-6 md:grid-cols-[minmax(0,1fr)_3.5rem_4rem_8rem]">
                  <span>Producto</span>
                  <span className="text-center">Cantidad</span>
                  <span className="text-center">Unidad</span>
                  <span aria-hidden="true" />
                </div>
                <ul className="divide-y divide-zinc-100">
                  {list[category.id].map((product) => (
                    <li
                      key={product.id}
                      className="grid grid-cols-[minmax(0,1fr)_3.5rem_4rem_2.5rem] items-center gap-2 px-4 py-2 sm:grid-cols-[minmax(0,1fr)_3.5rem_4rem_2.5rem] sm:gap-2 sm:px-6 md:grid-cols-[minmax(0,1fr)_3.5rem_4rem_8rem]"
                    >
                      <div className="flex min-w-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={
                            !canEditList ||
                            isLoading ||
                            purchaseBusy ||
                            !!purchaseConfirmation ||
                            pendingSaveCount > 0
                          }
                          onClick={() => handleOpenModal(product)}
                          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg text-left text-sm hover:text-zinc-500 sm:gap-3"
                        >
                          {selectionMode ? <input type="checkbox" aria-label={`Seleccionar ${product.name}`} checked={selectedIds.includes(product.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, product.id] : current.filter((id) => id !== product.id))} /> : <span
                            aria-hidden="true"
                            className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${product.comprado === "1" ? "border-zinc-900 bg-zinc-900 text-xs text-white" : "border-zinc-300"}`}
                          >
                            {product.comprado === "1" ? "✓" : ""}
                          </span>}
                          <span
                            className={`min-w-0 flex-1 break-words ${product.comprado === "1" ? "text-zinc-500 line-through" : "font-medium"}`}
                          >
                            {product.name}
                          </span>
                          <span className="sr-only">
                            {product.comprado === "1"
                              ? ", desmarcar comprado"
                              : ", registrar compra"}
                          </span>
                        </button>
                        {product.isProvisional && (
                          <ProvisionalInfo
                            description={`Provisional · agregado por ${product.createdBy || "un miembro de la lista"}${
                              product.catalogRequestEmail
                                ? ` · solicitud ${
                                    product.catalogRequestStatus === "approved"
                                      ? "aprobada"
                                      : product.catalogRequestStatus ===
                                          "rejected"
                                        ? "rechazada"
                                        : "pendiente"
                                  } de ${product.catalogRequestEmail}`
                                : ""
                            }`}
                          />
                        )}
                      </div>
                      <input
                        aria-label={`Cantidad de ${product.name}`}
                        className="h-10 min-w-0 w-full rounded-lg border border-zinc-300 px-1.5 text-center text-base tabular-nums focus:ring-2 focus:ring-zinc-400 sm:h-9 sm:text-sm"
                        type="number"
                        min={
                          requiresWholeQuantity(product.unit ?? "un")
                            ? "1"
                            : "0.000001"
                        }
                        step={
                          requiresWholeQuantity(product.unit ?? "un")
                            ? "1"
                            : "any"
                        }
                        disabled={
                          !canEditList ||
                          isLoading ||
                          purchaseBusy ||
                          !!purchaseConfirmation ||
                          product.comprado === "1"
                        }
                        value={quantityDrafts[product.id] ?? product.cantidad}
                        onChange={(e) => {
                          setQuantityDrafts((drafts) => ({
                            ...drafts,
                            [product.id]: e.target.value,
                          }));
                          handleInputChange(
                            e,
                            product.id,
                            category.id,
                            "cantidad",
                          );
                        }}
                        onBlur={() =>
                          setQuantityDrafts((drafts) => {
                            const nextDrafts = { ...drafts };
                            delete nextDrafts[product.id];
                            return nextDrafts;
                          })
                        }
                      />
                      <UnitSelect
                        compact
                        label="Unidad"
                        value={product.unit ?? "un"}
                        options={
                          product.availableUnits?.length
                            ? product.availableUnits
                            : compatibleUnits(product.productUnit ?? "un")
                        }
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
                      <div className="hidden items-center justify-end gap-1 md:flex">
                        <button
                          type="button"
                          className="flex size-10 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={
                            !canEditList ||
                            isLoading ||
                            purchaseBusy ||
                            !!purchaseConfirmation ||
                            pendingSaveCount > 0 ||
                            product.comprado === "1"
                          }
                          aria-label={`Mover ${product.name} a otro listado`}
                          onClick={() =>
                            void openMovePrompt(
                              { itemId: product.id },
                              product.name,
                            )
                          }
                          title={`Mover ${product.name} a otro listado`}
                        >
                          <RiArrowLeftRightLine aria-hidden="true" size={20} />
                        </button>
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
                        <button
                          type="button"
                          className="flex size-10 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={
                            !canEditList ||
                            isLoading ||
                            purchaseBusy ||
                            !!purchaseConfirmation ||
                            pendingSaveCount > 0
                          }
                          aria-label={`Ver o editar detalles de ${product.name}`}
                          onClick={() => openDetailsModal(product)}
                          title={`Ver o editar detalles de ${product.name}`}
                        >
                          <RiMore2Fill aria-hidden="true" size={20} />
                        </button>
                      </div>
                      <ActionMenu
                        label={`Acciones para ${product.name}`}
                        items={[
                          {
                            label: "Mover a otra lista",
                            icon: RiArrowLeftRightLine,
                            disabled:
                              !canEditList ||
                              isLoading ||
                              purchaseBusy ||
                              !!purchaseConfirmation ||
                              pendingSaveCount > 0 ||
                              product.comprado === "1",
                            onSelect: () =>
                              void openMovePrompt(
                                { itemId: product.id },
                                product.name,
                              ),
                          },
                          {
                            label: "Eliminar del carrito",
                            icon: RiDeleteBin6Line,
                            destructive: true,
                            disabled:
                              !canEditList ||
                              isLoading ||
                              purchaseBusy ||
                              !!purchaseConfirmation ||
                              pendingSaveCount > 0,
                            onSelect: () =>
                              removeItems(
                                { productId: product.id },
                                product.name,
                              ),
                          },
                          {
                            label: "Ver o editar detalles",
                            icon: RiMore2Fill,
                            disabled:
                              !canEditList ||
                              isLoading ||
                              purchaseBusy ||
                              !!purchaseConfirmation ||
                              pendingSaveCount > 0,
                            onSelect: () => openDetailsModal(product),
                          },
                        ]}
                      />
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
          title={
            purchaseConfirmation.isPartial
              ? "Finalizar compra parcial"
              : "Finalizar compra"
          }
          onClose={() => {
            if (!submitting.current) setPurchaseConfirmation(null);
          }}
        >
          <h2 className="text-xl font-semibold">
            {purchaseConfirmation.isPartial
              ? "Finalizar compra parcial"
              : "Finalizar compra"}
          </h2>
          <p className="mt-4">
            Los productos marcados como comprados (
            {purchaseConfirmation.ids.length}) se quitarán del carrito activo y
            se guardarán como una compra/lista terminada en el historial.
          </p>
          {purchaseConfirmation.isPartial ? (
            <p className="mt-3">
              Los productos sin marcar seguirán en el carrito, que conservará
              su nombre e identidad.
            </p>
          ) : (
            <p className="mt-3">
              Todos los productos están marcados como comprados. La lista se
              vaciará y la compra aparecerá en el historial.
            </p>
          )}
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
              {purchaseBusy
                ? "Guardando…"
                : purchaseConfirmation.isPartial
                  ? "Confirmar compra parcial"
                  : "Confirmar compra"}
            </button>
          </div>
        </Modal>
      )}
      <ConfirmModal
        isOpen={!!removeConfirmation}
        title="Eliminar del carrito"
        message={removeConfirmation?.message ?? ""}
        confirmLabel="Eliminar"
        destructive
        busy={isLoading}
        onClose={() => setRemoveConfirmation(null)}
        onConfirm={() => {
          if (!removeConfirmation) return;
          const { target } = removeConfirmation;
          setRemoveConfirmation(null);
          void mutateCart("DELETE", target);
        }}
      />
      {movePrompt && (
        <Modal
          isOpen
          title="Mover a otro listado"
          onClose={() => {
            if (!moveBusy) setMovePrompt(null);
          }}
        >
          <h2 className="text-xl font-semibold">Mover a otro listado</h2>
          <p className="mt-3">
            Se moverán los artículos pendientes de{" "}
            <strong>{movePrompt.name}</strong>. Si el destino ya tiene el
            artículo con la misma unidad, se sumarán las cantidades; si la
            unidad difiere, no se hará el movimiento. La unidad y los datos
            existentes del destino se mantienen.
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Los artículos comprados no se pueden mover. Las notas de sugerencias
            anteriores no se trasladan; los datos del catálogo y las notas
            asociadas permanecen con el producto.
          </p>
          <label
            className="mt-5 block text-sm font-medium"
            htmlFor="move-list-target"
          >
            Listado de destino
          </label>
          <select
            id="move-list-target"
            className="mt-2 h-11 w-full rounded-lg border border-zinc-300 px-3"
            value={moveDestination}
            onChange={(event) => {
              setMoveDestination(event.target.value);
              setError("");
            }}
            disabled={moveBusy}
          >
            <option value="" disabled>
              Elige un listado
            </option>
            {moveTargets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name}
              </option>
            ))}
            <option value="__create_new__">Crear una nueva lista…</option>
          </select>
          {moveDestination === "__create_new__" && (
            <label
              className="mt-4 block text-sm font-medium"
              htmlFor="new-move-list-name"
            >
              Nombre de la nueva lista
              <input
                id="new-move-list-name"
                className="field mt-2"
                value={newMoveListName}
                onChange={(event) => {
                  setNewMoveListName(event.target.value);
                  setError("");
                }}
                maxLength={200}
                disabled={moveBusy}
                autoFocus
              />
            </label>
          )}
          {error && (
            <p role="alert" className="error-notice mt-4">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              disabled={moveBusy}
              onClick={() => setMovePrompt(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={
                moveBusy ||
                !moveDestination ||
                (moveDestination === "__create_new__" &&
                  !newMoveListName.trim())
              }
              onClick={() => {
                if (moveDestination === "__create_new__") void createAndMove();
                else if (moveDestination) void confirmMove(moveDestination);
              }}
            >
              {moveBusy
                ? "Moviendo…"
                : moveDestination === "__create_new__"
                  ? "Crear lista y mover"
                  : "Mover artículos"}
            </button>
          </div>
        </Modal>
      )}
      {listModal && (
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
          availableUnits={
            listModal.availableUnits ?? [listModal.productUnit ?? "un"]
          }
          description={listModal.description ?? ""}
        />
      )}
      {canEditList && detailsModal && (
        <ProductDetailsModal
          item={detailsModal}
          canManageList={canManageList}
          onClose={handleCloseDetailsModal}
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

List.displayName = 'List';
