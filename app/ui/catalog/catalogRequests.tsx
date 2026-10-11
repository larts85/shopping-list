"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/app/actions/profile";
import { getCategories } from "@/app/actions/categories";
import {
  getCatalogRequests,
  submitCatalogRequest,
  reviewCatalogRequest,
  type CatalogRequest,
} from "@/app/actions/catalogRequests";
import type { Category } from "@/app/lib/types";
import { units, unitLabels, type Unit } from "@/app/lib/units";
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
  async function load() {
    const [user, cats, items] = await Promise.all([
      getCurrentUser(),
      getCategories(),
      getCatalogRequests(),
    ]);
    setRole(user.role);
    setCategories(cats);
    setRequests(items);
  }
  useEffect(() => {
    void load().catch(() =>
      setError("No pudimos cargar el catálogo y sus solicitudes."),
    );
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      await load();
      setMessage("Solicitud guardada.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
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
                <label>
                  Categoría
                  <select
                    className="field mt-2"
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Selecciona una categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Unidad de medida
                  <select
                    className="field mt-2"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as Unit)}
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {unitLabels[u]}
                      </option>
                    ))}
                  </select>
                </label>
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
      <ul className="divide-y divide-zinc-200">
        {requests.map((r) => (
          <li key={r.id} className="py-4 space-y-2">
            <p>
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
                    void run(() => reviewCatalogRequest(r.id, "approve"))
                  }
                >
                  Aprobar
                </button>
                <button
                  className="btn-secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(() => reviewCatalogRequest(r.id, "reject"))
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
