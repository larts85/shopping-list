"use client";
import { getActiveListId } from "@/app/lib/listClient";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SharedDataModal from "./sharedDataModal";
import {
  getHouseholdData,
  revokeAccess,
  renameHousehold,
  suggestHouseholdName,
  reviewHouseholdName,
} from "../../actions/households";
type Data = Awaited<ReturnType<typeof getHouseholdData>>;
export default function SharedData() {
  const [data, setData] = useState<Data>();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  async function load(resetName = true) {
    try {
      const d = await getHouseholdData(getActiveListId());
      setData(d);
      setError("");
      if (resetName) setName(d.household.name);
    } catch {
      setError("No se pudieron cargar los accesos.");
    }
  }
  useEffect(() => {
    void load();
    const refresh = () => {
      void load(false);
    };
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    window.addEventListener("active-list-changed", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("active-list-changed", refresh);
    };
  }, []);
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      await load();
      setMessage("Cambios guardados.");
      window.dispatchEvent(new Event("active-list-changed"));
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar la operación",
      );
    } finally {
      setBusy(false);
    }
  }
  const owner = data?.email === data?.household.owner_email;
  return (
    <div className="panel mx-auto max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold">Accesos de la lista</h2>
      {error && (
        <p role="alert" className="error-notice">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {!data && !error && <p>Cargando…</p>}
      {data && (
        <>
          <p>
            <strong>{data.household.name}</strong> · Propietario:{" "}
            {data.household.owner_email}
          </p>
          {data.role === "admin" && (
            <p>
              Rol en la aplicación: <strong>Administrador</strong>.
            </p>
          )}
          <form
            className="flex flex-wrap gap-3 items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() =>
                owner
                  ? renameHousehold(name, getActiveListId())
                  : suggestHouseholdName(name, getActiveListId()),
              );
            }}
          >
            <label>
              {owner ? "Nombre de la lista" : "Proponer nombre de la lista"}
              <input
                className="field mt-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={200}
              />
            </label>
            <button className="btn-secondary" disabled={busy}>
              {owner ? "Guardar nombre" : "Enviar sugerencia de nombre"}
            </button>
          </form>
          <section aria-label="Sugerencias de nombre" className="space-y-3">
            <h3 className="font-semibold">Sugerencias de nombre</h3>
            <p className="text-sm">
              El propietario decide si cambia el nombre de la lista.
            </p>
            {data.nameSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="space-y-2">
                <p>
                  {suggestion.name} · {suggestion.email} ·{" "}
                  {suggestion.status === "pending"
                    ? "Pendiente"
                    : suggestion.status === "approved"
                      ? "Aprobada"
                      : "Rechazada"}
                </p>
                {owner && suggestion.status === "pending" && (
                  <div className="flex gap-3">
                    <button
                      className="btn-primary"
                      disabled={busy}
                      onClick={() =>
                        void run(() =>
                          reviewHouseholdName(
                            suggestion.id,
                            "approve",
                            getActiveListId(),
                          ),
                        )
                      }
                    >
                      Aprobar nombre
                    </button>
                    <button
                      className="btn-secondary"
                      disabled={busy}
                      onClick={() =>
                        void run(() =>
                          reviewHouseholdName(
                            suggestion.id,
                            "reject",
                            getActiveListId(),
                          ),
                        )
                      }
                    >
                      Rechazar nombre
                    </button>
                  </div>
                )}
              </div>
            ))}
            {!data.nameSuggestions.length && (
              <p className="text-sm">No hay sugerencias de nombre.</p>
            )}
          </section>
          <p className="text-sm">
            {data.memberCount} personas con membresía activa.
          </p>
          <ul className="divide-y divide-zinc-200">
            {data.members.map((m) => (
              <li
                key={m.email}
                className="py-3 flex flex-wrap items-center gap-3"
              >
                <span>{m.email}</span>
                <span>
                  {m.email === data.household.owner_email
                    ? "Propietario"
                    : "Colaborador"}
                </span>
                {owner && m.email !== data.household.owner_email && (
                  <button
                    className="btn-secondary"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          `¿Quitar el acceso de ${m.email} a esta lista?`,
                        )
                      )
                        void run(() =>
                          revokeAccess(m.email, getActiveListId()),
                        );
                    }}
                  >
                    Quitar acceso
                  </button>
                )}
              </li>
            ))}
          </ul>
          {owner && (
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() => setOpen(true)}
            >
              Compartir lista
            </button>
          )}
          {owner &&
            data.pending.map((i) => (
              <p key={i.id} className="flex flex-wrap gap-3">
                Invitación pendiente: {i.email}
                <button
                  disabled={busy}
                  className="btn-secondary"
                  onClick={() =>
                    void run(() => revokeAccess(i.email, getActiveListId()))
                  }
                >
                  Cancelar invitación
                </button>
              </p>
            ))}
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
    </div>
  );
}
