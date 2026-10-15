"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/app/actions/profile";
import { getCategories } from "@/app/actions/categories";
import {
  getCatalogRequests,
  submitCatalogRequest,
  reviewCatalogRequest,
  reviewCatalogRequests,
  type CatalogRequest,
  type CatalogRequestSubmissionResult,
} from "@/app/actions/catalogRequests";
import type { Category } from "@/app/lib/types";
import {
  isUnitAllowedForCategory,
  unitsForCategory,
  type Unit,
} from "@/app/lib/units";
import Autocomplete from "@/shared/components/ui/Autocomplete";
import UnitSelect from "@/shared/components/ui/UnitSelect";
import ActionMenu from "@/shared/components/ui/ActionMenu";
import { RiCheckLine, RiCloseLine } from "react-icons/ri";
import { getActiveListId } from "@/app/lib/listClient";
export default function CatalogRequests() {
  const [role, setRole] = useState<"admin" | "user">();
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [categories, setCategories] = useState<Category[]>([]),
    [requests, setRequests] = useState<CatalogRequest[]>([]);
  const [kind, setKind] = useState<"category" | "product">("product"),
    [name, setName] = useState(""),
    [categoryId, setCategoryId] = useState(""),
    [unit, setUnit] = useState<Unit>("un"),
    [note, setNote] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const selectedCategoryName =
    categories.find((category) => category.id === categoryId)?.name ?? "";
  const handleCategoryChange = (nextCategoryId: string) => {
    setCategoryId(nextCategoryId);
    const nextCategoryName =
      categories.find((category) => category.id === nextCategoryId)?.name ?? "";
    if (!isUnitAllowedForCategory(unit, nextCategoryName)) setUnit("un");
  };
  async function load() {
    setLoadState("loading");
    setError("");
    try {
      const [user, cats, items] = await Promise.all([
        getCurrentUser(),
        getCategories(),
        getCatalogRequests(),
      ]);
      setRole(user.role);
      setCategories(cats);
      setRequests(items);
      setSelectedRequestIds((current) =>
        current.filter((id) =>
          items.some((item) => item.id === id && item.status === "pending"),
        ),
      );
      setLoadState("ready");
    } catch {
      setError("No pudimos cargar el catálogo y sus solicitudes.");
      setLoadState("error");
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function run(
    action: () => Promise<void | CatalogRequestSubmissionResult>,
    successMessage?: string,
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await action();
      await load();
      setMessage(
        successMessage ??
          (result && result.kind === "product"
            ? result.addedToList
              ? "Solicitud enviada y producto agregado a tus compras."
              : "Solicitud guardada. Selecciona o crea una lista para agregar el producto a tus compras."
            : "Solicitud guardada."),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  const pendingRequests = requests.filter(
    (request) => request.status === "pending",
  );
  const allPendingSelected =
    pendingRequests.length > 0 &&
    pendingRequests.every((request) => selectedRequestIds.includes(request.id));
  return (
    <section className="panel space-y-5" aria-label="Solicitudes del catálogo">
      <h2 className="text-xl font-semibold">
        {role === "admin"
          ? "Solicitudes del catálogo general"
          : role === "user"
            ? "Solicitar una categoría o producto"
            : "Solicitudes del catálogo"}
      </h2>
      <p className="text-sm text-zinc-600">
        {role === "admin"
          ? "Revisa y aprueba las solicitudes pendientes."
          : role === "user"
            ? "Solicita los productos o categorías que necesitas."
            : "Consulta y gestiona solicitudes de categorías y productos."}
      </p>
      {error && (
        <p role="alert" className="error-notice">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {loadState === "loading" && (
        <p role="status" className="loading-state">
          Cargando catálogo y solicitudes…
        </p>
      )}
      {loadState === "error" && (
        <button className="btn-secondary" onClick={() => void load()}>
          Reintentar
        </button>
      )}
      {loadState === "ready" && role === "user" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (kind === "product" && !categoryId) {
              setError("Selecciona una categoría para el producto.");
              return;
            }
            void run(async () => {
              const result = await submitCatalogRequest(
                {
                  kind,
                  name,
                  categoryId: kind === "product" ? categoryId : undefined,
                  unit: kind === "product" ? unit : undefined,
                  note,
                },
                getActiveListId(),
              );
              setName("");
              setNote("");
              return result;
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              Quiero solicitar
              <select
                className="field mt-2"
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as "category" | "product")
                }
              >
                <option value="product">Producto</option>
                <option value="category">Categoría</option>
              </select>
            </label>
            <label>
              Nombre
              <input
                className="field mt-2"
                required
                maxLength={200}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            {kind === "product" && (
              <>
                <Autocomplete
                  label="Categoría"
                  value=""
                  selectedValue={categoryId}
                  selectedLabel={
                    categories.find((c) => c.id === categoryId)?.name ?? ""
                  }
                  options={categories.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  onChange={handleCategoryChange}
                  onSelect={(option) => handleCategoryChange(option.value)}
                  placeholder="Selecciona una categoría"
                  disabled={categories.length === 0}
                  required
                />
                <UnitSelect
                  value={unit}
                  options={unitsForCategory(selectedCategoryName)}
                  onChange={setUnit}
                />
              </>
            )}
          </div>
          <label className="block">
            Nota (opcional)
            <input
              className="field mt-2"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <button className="btn-primary" disabled={busy}>
            Enviar solicitud
          </button>
        </form>
      )}
      {loadState === "ready" && (
        <h3 className="text-lg font-semibold">Historial de solicitudes</h3>
      )}
      {loadState === "ready" &&
        role === "admin" &&
        pendingRequests.length > 0 && (
        <div className="space-y-3 rounded-xl border border-zinc-200 p-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allPendingSelected}
              disabled={busy}
              onChange={(event) =>
                setSelectedRequestIds(
                  event.target.checked
                    ? pendingRequests.map((request) => request.id)
                    : [],
                )
              }
            />
            Seleccionar solicitudes pendientes visibles (
            {pendingRequests.length})
          </label>
          {selectedRequestIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="mr-auto text-sm font-medium">
                {selectedRequestIds.length} solicitudes seleccionadas
              </p>
              <button
                className="btn-primary"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => reviewCatalogRequests(selectedRequestIds, "approve"),
                    `${selectedRequestIds.length} solicitudes aprobadas.`,
                  )
                }
              >
                {busy ? "Guardando…" : "Aprobar seleccionadas"}
              </button>
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => reviewCatalogRequests(selectedRequestIds, "reject"),
                    `${selectedRequestIds.length} solicitudes rechazadas.`,
                  )
                }
              >
                {busy ? "Guardando…" : "Rechazar seleccionadas"}
              </button>
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={() => setSelectedRequestIds([])}
              >
                Limpiar selección
              </button>
            </div>
          )}
        </div>
      )}
      <ul className="divide-y divide-zinc-200">
        {loadState === "ready" &&
          requests.map((r) => (
          <li key={r.id} className="py-4 space-y-2">
            <p>
              {role === "admin" && r.status === "pending" && (
                <input
                  type="checkbox"
                  aria-label={`Seleccionar solicitud de ${r.name}`}
                  className="mr-2"
                  checked={selectedRequestIds.includes(r.id)}
                  disabled={busy}
                  onChange={(event) =>
                    setSelectedRequestIds((current) =>
                      event.target.checked
                        ? [...new Set([...current, r.id])]
                        : current.filter((id) => id !== r.id),
                    )
                  }
                />
              )}
              <strong>
                {r.kind === "category" ? "Categoría" : "Producto"}: {r.name}
              </strong>{" "}
              {r.unit ? `· ${r.unit}` : ""} ·{" "}
              {
                {
                  pending: "Pendiente",
                  approved: "Aprobada",
                  rejected: "Rechazada",
                }[r.status]
              }
            </p>
            {r.category_id && (
              <p className="text-sm">
                Categoría:{" "}
                {categories.find((c) => c.id === r.category_id)?.name ??
                  "Retirada del catálogo"}
              </p>
            )}
            <p className="text-sm text-zinc-500">
              {role === "admin" ? r.email : ""}
              {r.note ? ` · ${r.note}` : ""}
            </p>
            {role === "admin" && r.status === "pending" && (
              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-3 md:flex">
                  <button
                    className="btn-primary"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () => reviewCatalogRequest(r.id, "approve"),
                        "Solicitud aprobada.",
                      )
                    }
                  >
                    Aprobar
                  </button>
                  <button
                    className="btn-secondary"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () => reviewCatalogRequest(r.id, "reject"),
                        "Solicitud rechazada.",
                      )
                    }
                  >
                    Rechazar
                  </button>
                </div>
                <ActionMenu
                  label={`Acciones para la solicitud de ${r.name}`}
                  items={[
                    {
                      label: "Aprobar solicitud",
                      icon: RiCheckLine,
                      disabled: busy,
                      onSelect: () =>
                        void run(
                          () => reviewCatalogRequest(r.id, "approve"),
                          "Solicitud aprobada.",
                        ),
                    },
                    {
                      label: "Rechazar solicitud",
                      icon: RiCloseLine,
                      destructive: true,
                      disabled: busy,
                      onSelect: () =>
                        void run(
                          () => reviewCatalogRequest(r.id, "reject"),
                          "Solicitud rechazada.",
                        ),
                    },
                  ]}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
      {loadState === "ready" && !requests.length && (
        <p className="text-sm">No hay solicitudes.</p>
      )}
    </section>
  );
}

CatalogRequests.displayName = 'CatalogRequests';
