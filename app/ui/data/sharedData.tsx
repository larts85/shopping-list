"use client";
import { useEffect, useState } from "react";
import SharedDataModal from "./sharedDataModal";
import {
  getHouseholdData,
  acceptInvitation,
  switchHousehold,
  revokeAccess,
} from "../../actions/households";
import {
  authorizeImport,
  importLegacy,
  findLegacySheets,
  previewLegacy,
  verifyLegacyImport,
} from "../../actions/importLegacy";
type Data = Awaited<ReturnType<typeof getHouseholdData>>;
export default function SharedData() {
  const [data, setData] = useState<Data>();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [source, setSource] = useState("");
  const [sheets, setSheets] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      setData(await getHouseholdData());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar los datos",
      );
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      await load();
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
      <h1 className="text-xl font-semibold">Datos del hogar</h1>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {!data && !error && <p>Cargando…</p>}
      {data && (
        <>
          <section className="space-y-4">
            <h2 className="text-xl">{data.household.name}</h2>
            <p>Propietario: {data.household.owner_email}</p>
            {data.households.length > 1 && (
              <label className="block">
                Hogar activo
                <select
                  aria-label="Hogar activo"
                  value={data.household.id}
                  disabled={busy}
                  className="border p-2 ml-2"
                  onChange={(e) =>
                    void run(() => switchHousehold(e.target.value))
                  }
                >
                  {data.households.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.owner_email})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <ul>
              {data.members.map((m) => (
                <li key={m.email} className="flex gap-4">
                  {m.email}
                  {owner && m.email !== data.email && (
                    <button
                      disabled={busy}
                      onClick={() => void run(() => revokeAccess(m.email))}
                    >
                      Quitar acceso
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {owner && (
              <button
                className="bg-black text-white px-6 py-3"
                disabled={busy}
                onClick={() => setOpen(true)}
              >
                Compartir Datos
              </button>
            )}
            {owner &&
              data.pending.map((i) => (
                <p key={i.id}>
                  Invitación pendiente: {i.email}{" "}
                  <button
                    disabled={busy}
                    onClick={() => void run(() => revokeAccess(i.email))}
                  >
                    Cancelar invitación
                  </button>
                </p>
              ))}
          </section>
          {data.invitations.length > 0 && (
            <section>
              <h2 className="text-xl">Invitaciones recibidas</h2>
              {data.invitations.map((i) => (
                <div key={i.id} className="py-3">
                  {i.name} ({i.owner_email}){" "}
                  <button
                    disabled={busy}
                    className="border p-2"
                    onClick={() => void run(() => acceptInvitation(i.id))}
                  >
                    Aceptar invitación
                  </button>
                </div>
              ))}
            </section>
          )}
          {owner && (
            <section className="space-y-4">
              <h2 className="text-xl">Importar la planilla anterior</h2>
              {data.imported ? (
                <div className="space-y-3">
                  <p>
                    La importación ya está completa. Las operaciones se guardan
                    en Supabase.
                  </p>
                  <button
                    disabled={busy}
                    className="border p-3"
                    onClick={() =>
                      void run(async () => {
                        const result = await verifyLegacyImport();
                        setMessage(
                          `${result.matches ? "Verificación correcta" : "Los datos actuales difieren de la planilla"}: ${result.categories} categorías, ${result.products} productos, ${result.list} compras y ${result.historical} registros históricos. Se comparan nombres, categorías, selección y todos los campos del historial.`,
                        );
                      })
                    }
                  >
                    Verificar importación
                  </button>
                </div>
              ) : (
                <>
                  <p>
                    Importa categorías, productos, lista e historial en un hogar
                    vacío. La planilla original se conserva.
                  </p>
                  <button
                    disabled={busy}
                    className="border p-3"
                    onClick={() =>
                      void run(async () => {
                        const found = await findLegacySheets();
                        setSheets(found);
                        if (found.length === 1) setSource(found[0].id);
                        if (!found.length)
                          setMessage(
                            "No se encontró homeLogisticSheet. Pega el enlace de la planilla.",
                          );
                      })
                    }
                  >
                    Buscar planilla anterior
                  </button>
                  {sheets.length > 1 && (
                    <label>
                      Planilla
                      <select
                        aria-label="Planilla anterior"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                      >
                        <option value="">Selecciona una planilla</option>
                        {sheets.map((sheet) => (
                          <option key={sheet.id} value={sheet.id}>
                            {sheet.name} ({sheet.id})
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <button
                    disabled={busy || !source}
                    className="border p-3"
                    onClick={() =>
                      void run(async () => {
                        const preview = await previewLegacy(source);
                        setMessage(
                          preview
                            .map(
                              (tab) =>
                                `${tab.tab}: ${tab.count} registros${tab.names.length ? ` (pruebas pendientes: ${tab.names.join(", ")})` : ""}`,
                            )
                            .join("; "),
                        );
                      })
                    }
                  >
                    Revisar antes de importar
                  </button>
                  <form action={authorizeImport}>
                    <button className="border p-3" disabled={busy}>
                      Autorizar lectura de Google Sheets
                    </button>
                  </form>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run(async () => {
                        const counts = await importLegacy(source);
                        setMessage(
                          `Importados: ${counts.categories} categorías, ${counts.products} productos, ${counts.list} compras y ${counts.historical} registros históricos.`,
                        );
                      });
                    }}
                    className="space-y-3"
                  >
                    <label className="block">
                      Enlace o ID de homeLogisticSheet
                      <input
                        required
                        className="border p-3 w-full"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                      />
                    </label>
                    <button
                      disabled={busy}
                      className="bg-black text-white px-6 py-3"
                    >
                      {busy ? "Importando…" : "Importar a Supabase"}
                    </button>
                  </form>
                </>
              )}
            </section>
          )}
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
