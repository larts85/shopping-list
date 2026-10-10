"use client";
import { useEffect, useState } from "react";
import {
  getHouseholdData,
  acceptInvitation,
  switchHousehold,
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
  const [message, setMessage] = useState("");
  async function load() {
    try {
      setData(await getHouseholdData());
    } catch {
      setError("No se pudieron cargar las listas compartidas.");
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function change(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
      await onSwitch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar de lista");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel space-y-3" aria-label="Lista compartida">
      {error && (
        <p role="alert" className="error-notice">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {data && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium">
              Lista del hogar
              <select
                aria-label="Lista del hogar"
                className="field mt-2"
                value={data.household.id}
                disabled={busy}
                onChange={(e) => {
                  if (
                    window.confirm(
                      "Cambiar de hogar descarta los cambios sin guardar de esta lista.",
                    )
                  )
                    void change(() => switchHousehold(e.target.value));
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
            <a className="text-sm underline" href="/logistic/data">
              Administrar accesos
            </a>
          </div>
          <p className="text-sm text-zinc-500">
            {data.members.length}{" "}
            {data.members.length === 1 ? "persona tiene" : "personas tienen"}{" "}
            acceso a esta lista.
          </p>
          {data.invitations.map((i) => (
            <div key={i.id} className="flex flex-wrap gap-3 items-center">
              <span>
                Invitación de {i.owner_email} a {i.name}
              </span>
              <button
                className="btn-primary"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Aceptar abre el hogar compartido y descarta los cambios sin guardar.",
                    )
                  )
                    void change(() => acceptInvitation(i.id));
                }}
              >
                Aceptar y abrir lista
              </button>
            </div>
          ))}
          {data.pending.map((i) => (
            <p key={i.id} className="text-sm">
              Invitación pendiente: {i.email}
            </p>
          ))}
        </>
      )}
      {open && (
        <SharedDataModal
          isOpen
          onClose={(shared) => {
            setOpen(false);
            if (shared)
              setMessage(
                "Invitación guardada. La otra persona puede aceptarla desde su lista.",
              );
            void load();
          }}
        />
      )}
    </section>
  );
}
