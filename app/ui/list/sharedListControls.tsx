"use client";
import { getActiveListId, setActiveListId } from "@/app/lib/listClient";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getHouseholdData,
  switchHousehold,
  createHousehold,
} from "@/app/actions/households";
import SharedDataModal from "../data/sharedDataModal";
type Data = Awaited<ReturnType<typeof getHouseholdData>>;
export default function SharedListControls({
  onSwitch,
}: {
  onSwitch: () => Promise<void>;
}) {
  const [data, setData] = useState<Data>();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  async function load() {
    try {
      const d = await getHouseholdData(getActiveListId());
      setActiveListId(d.household.id);
      setData(d);
      setCopied(false);
    } catch {
      setError("No pudimos cargar tus listas.");
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function change(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
      await onSwitch();
      window.dispatchEvent(new Event("active-list-changed"));
      router.push("/logistic");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar de lista");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel space-y-4" aria-label="Mis listas">
      {error && (
        <p role="alert" className="error-notice">
          {error}
        </p>
      )}
      {data && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium">
              Lista activa
              <select
                aria-label="Lista activa"
                className="field mt-2"
                value={data.household.id}
                disabled={busy}
                onChange={(e) => {
                  const id = e.target.value;
                  if (
                    window.confirm(
                      "Cambiar de lista descarta los cambios sin guardar. ¿Continuar?",
                    )
                  )
                    void change(() =>
                      switchHousehold(id).then(() => setActiveListId(id)),
                    );
                }}
              >
                {data.households.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.owner_email})
                  </option>
                ))}
              </select>
            </label>
            {data.email === data.household.owner_email && (
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={() => setOpen(true)}
              >
                Compartir lista
              </button>
            )}
            <button
              className="btn-secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    new URL(
                      `/logistic/lists/${data.household.slug}`,
                      window.location.origin,
                    ).href,
                  );
                  setCopied(true);
                } catch {
                  setError("No pudimos copiar el enlace. Intenta nuevamente.");
                }
              }}
            >
              {copied ? "Enlace copiado" : "Copiar enlace"}
            </button>
            <a className="text-sm underline" href="/logistic/data">
              Accesos y nombre
            </a>
          </div>
          <p className="text-sm text-zinc-500">
            {data.memberCount}{" "}
            {data.memberCount === 1 ? "persona tiene" : "personas tienen"}{" "}
            acceso.
            {data.role === "admin" && " Rol en la aplicación: Administrador."}
            {data.canEditList
              ? " Puedes gestionar esta lista."
              : " Puedes verla y sugerir cambios."}
          </p>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                window.confirm(
                  "Crear otra lista conserva la actual y abre la nueva. Se descartarán los cambios sin guardar. ¿Continuar?",
                )
              )
                void change(async () => {
                  const id = await createHousehold(name, getActiveListId());
                  setActiveListId(id);
                  setName("");
                });
            }}
          >
            <label className="text-sm font-medium">
              Nombre de la nueva lista
              <input
                className="field mt-2"
                required
                maxLength={200}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej.: Supermercado, ferretería…"
              />
            </label>
            <button className="btn-secondary" disabled={busy || !name.trim()}>
              Crear otra lista
            </button>
          </form>
          <p className="text-sm text-zinc-500">
            Copiar el enlace no crea una invitación. El propietario debe invitar
            el correo de Google de la persona desde Compartir lista. Cada lista
            conserva sus productos pendientes y compras por separado. La nueva
            empieza vacía y utiliza el catálogo general de la app.
          </p>
        </>
      )}
      {open && (
        <SharedDataModal
          isOpen
          onClose={() => {
            setOpen(false);
            void load();
          }}
        />
      )}
    </section>
  );
}
