"use client";
import Link from "next/link";
import { getActiveListId } from "@/app/lib/listClient";
import { useEffect, useState } from "react";
import { RiPencilLine } from "react-icons/ri";
import { getListData, renameList, suggestListName } from "@/app/actions/lists";
import Modal from "@/shared/components/ui/Modal";
import SharedDataModal from "../data/sharedDataModal";
type Data = Awaited<ReturnType<typeof getListData>>;
export default function SharedListControls({
  onSwitch,
}: {
  onSwitch: () => Promise<void>;
}) {
  const [data, setData] = useState<Data>();
  const [open, setOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameMessage, setNameMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  async function load() {
    try {
      setData(await getListData(getActiveListId()));
      setError("");
    } catch {
      setError("No pudimos cargar los accesos de la lista.");
    } finally {
      setIsLoading(false);
    }
  }
  async function saveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || nameBusy) return;
    setNameBusy(true);
    setNameError("");
    setNameMessage("");
    try {
      if (data.canEditList) {
        await renameList(name, getActiveListId());
        setData((current) =>
          current
            ? { ...current, list: { ...current.list, name: name.trim() } }
            : current,
        );
        setNameMessage("Se actualizó el nombre de la lista.");
      } else {
        await suggestListName(name, getActiveListId());
        setNameMessage("Se envió la sugerencia al propietario.");
      }
      setNameOpen(false);
      window.dispatchEvent(new Event("active-list-changed"));
    } catch (cause) {
      setNameError(
        cause instanceof Error
          ? cause.message
          : "No se pudo guardar el nombre.",
      );
    } finally {
      setNameBusy(false);
    }
  }
  useEffect(() => {
    void load();
    const refresh = () => {
      void load();
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
  if (isLoading && !data && !error) {
    return (
      <p role="status" className="loading-state">
        Cargando accesos de la lista…
      </p>
    );
  }
  return (
    <section className="panel space-y-4" aria-label="Accesos de la lista">
      {error && (
        <p role="alert" className="error-notice">
          {error}
        </p>
      )}
      {nameMessage && (
        <p role="status" className="text-sm text-emerald-700">
          {nameMessage}
        </p>
      )}
      {data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-0">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <h2 className="text-xl font-semibold">{data.list.name}</h2>
                <p className="text-sm text-zinc-500 block">
                  {data.memberCount}{" "}
                  {data.memberCount === 1 ? "persona tiene" : "personas tienen"}{" "}
                  acceso.{" "}
                  {data.canManageList
                    ? "Puedes gestionar esta lista."
                    : data.canEditList
                      ? "Puedes editar artículos y el nombre de la lista."
                      : "Tienes acceso de solo lectura a esta lista."}
                </p>
              </div>

              {data.canEditList && (
                <button
                  type="button"
                  aria-label={
                    data.canEditList
                      ? "Editar nombre de la lista"
                      : "Proponer nombre de la lista"
                  }
                  title={
                    data.canEditList
                      ? "Editar nombre de la lista"
                      : "Proponer nombre de la lista"
                  }
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-700"
                  onClick={() => {
                    setName(data.list.name);
                    setNameError("");
                    setNameMessage("");
                    setNameOpen(true);
                  }}
                >
                  <RiPencilLine aria-hidden="true" size={18} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Link className="btn-secondary" href="/">
                Carritos
              </Link>
              {data.canManageList && (
                <button className="btn-secondary" onClick={() => setOpen(true)}>
                  Compartir lista
                </button>
              )}
              <Link className="text-sm underline" href="/data">
                Accesos y nombre
              </Link>
            </div>
          </div>
        </>
      )}
      {open && (
        <SharedDataModal
          isOpen
          onClose={() => {
            setOpen(false);
            void load();
            void onSwitch();
          }}
        />
      )}
      {nameOpen && data && (
        <Modal
          isOpen
          onClose={() => !nameBusy && setNameOpen(false)}
          title={
            data.canEditList
              ? "Editar nombre de la lista"
              : "Proponer nombre de la lista"
          }
        >
          <h2 className="mb-3 text-xl font-semibold">
            {data.canEditList
              ? "Editar nombre de la lista"
              : "Proponer nombre"}
          </h2>
          {!data.canEditList && (
            <p className="mb-4 text-sm text-zinc-600">
              El propietario revisará tu sugerencia antes de cambiar el nombre.
            </p>
          )}
          {nameError && (
            <p role="alert" className="error-notice mb-4">
              {nameError}
            </p>
          )}
          <form
            className="space-y-4"
            onSubmit={(event) => void saveName(event)}
          >
            <label className="block text-sm font-medium">
              Nombre de la lista
              <input
                className="field mt-2"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={200}
                required
                disabled={nameBusy}
                autoFocus
              />
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setNameOpen(false)}
                disabled={nameBusy}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={nameBusy}>
                {nameBusy
                  ? "Guardando…"
                  : data.canEditList
                    ? "Guardar nombre"
                    : "Enviar sugerencia"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

SharedListControls.displayName = "SharedListControls";
