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
} from "@/app/actions/catalogRequests";
import type { Category } from "@/app/lib/types";
import { type Unit } from "@/app/lib/units";
import Autocomplete from "@/shared/components/ui/Autocomplete";
import UnitSelect from "@/shared/components/ui/UnitSelect";
export default function CatalogRequests() {
  const [role, setRole] = useState<"admin" | "user">();
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
  async function load() {
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
  }
  useEffect(() => {
    void load().catch(() =>
      setError("No pudimos cargar el catálogo y sus solicitudes."),
    );
  }, []);
  async function run(
    action: () => Promise<void>,
    successMessage = "Solicitud guardada.",
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      await load();
      setMessage(successMessage);
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
          : "Solicitar una categoría o producto"}
      </h2>
      <p className="text-sm text-zinc-600">
        {role === "admin"
          ? "Revisa y aprueba las solicitudes pendientes."
          : "Solicita los productos o categorías que necesitas."}
      </p>
      {error && (
        <p role="alert" className="error-notice">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {role === "user" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (kind === "product" && !categoryId) {
              setError("Selecciona una categoría para el producto.");
              return;
            }
            void run(async () => {
              await submitCatalogRequest({
                kind,
                name,
                categoryId: kind === "product" ? categoryId : undefined,
                unit: kind === "product" ? unit : undefined,
                note,
              });
              setName("");
              setNote("");
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
                  onChange={setCategoryId}
                  onSelect={(option) => setCategoryId(option.value)}
                  placeholder="Selecciona una categoría"
                  disabled={categories.length === 0}
                  required
                />
                <UnitSelect value={unit} onChange={setUnit} />
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
      <h3 className="text-lg font-semibold">Historial de solicitudes</h3>
      {role === "admin" && pendingRequests.length > 0 && (
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
        {requests.map((r) => (
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
              <div className="flex gap-3">
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
            )}
          </li>
        ))}
      </ul>
      {!requests.length && <p className="text-sm">No hay solicitudes.</p>}
    </section>
  );
}
