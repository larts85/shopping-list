"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearActiveListId,
  getActiveListId,
  setActiveListId,
} from "@/app/lib/listClient";
import type { getHomeLists } from "@/app/actions/households";
import CreateListModal from "./createListModal";
import ActionMenu from "@/shared/components/ui/ActionMenu";
import ConfirmModal from "@/shared/components/ui/ConfirmModal";
import { RiArrowRightLine, RiDeleteBin6Line } from "react-icons/ri";
type Data = Awaited<ReturnType<typeof getHomeLists>>;
export default function HomeLists({ defaultName }: { defaultName: string }) {
  const [data, setData] = useState<Data>();
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [deletingId, setDeletingId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [listToDelete, setListToDelete] = useState<Data["lists"][number] | null>(null);
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/households?view=home", {
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "No pudimos cargar tus listas.");
        if (!cancelled) {
          setData(result);
          setError("");
        }
      } catch (error) {
        if (!cancelled)
          setError(
            error instanceof Error
              ? error.message
              : "No pudimos cargar tus listas.",
          );
      }
    }
    void load();
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", load);
    };
  }, [attempt]);
  const own =
    data?.lists.filter((list) => list.owner_email === data.email) || [];
  const shared =
    data?.lists.filter((list) => list.owner_email !== data.email) || [];
  async function deleteList(list: Data["lists"][number]): Promise<boolean> {
    setDeletingId(list.id);
    setDeleteError("");
    try {
      const response = await fetch("/api/households", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: list.id }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "No pudimos eliminar la lista.");
      const wasActive = getActiveListId() === list.id;
      if (wasActive) {
        clearActiveListId();
        window.dispatchEvent(new Event("active-list-changed"));
      }
      setData((previous) =>
        previous
          ? {
              ...previous,
              lists: previous.lists.filter((item) => item.id !== list.id),
            }
          : previous,
      );
      if (wasActive) {
        router.push("/");
        router.refresh();
      }
      return true;
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "No pudimos eliminar la lista.",
      );
      return false;
    } finally {
      setDeletingId("");
    }
  }
  function openList(list: Data["lists"][number]) {
    setActiveListId(list.id);
    window.dispatchEvent(new Event("active-list-changed"));
    router.push(`/lists/${list.slug}`);
  }
  function cards(lists: Data["lists"]) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {lists.map((list) => (
          <article key={list.id} className="panel space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="min-w-0 break-words text-lg font-semibold">
                {list.name}
              </h3>
              <div className="hidden shrink-0 gap-2 md:flex">
                <Link
                  href={`/lists/${list.slug}`}
                  className="btn-secondary"
                  aria-label={`Abrir ${list.name}`}
                  onClick={() => {
                    setActiveListId(list.id);
                    window.dispatchEvent(new Event("active-list-changed"));
                  }}
                >
                  Abrir
                </Link>
                {list.owner_email === data?.email && (
                  <button
                    type="button"
                    className="btn-secondary text-red-700 hover:bg-red-50"
                    disabled={!!deletingId}
                    onClick={() => setListToDelete(list)}
                  >
                    {deletingId === list.id ? "Eliminando…" : "Eliminar"}
                  </button>
                )}
              </div>
              <ActionMenu
                label={`Acciones para la lista ${list.name}`}
                items={[
                  {
                    label: "Abrir lista",
                    icon: RiArrowRightLine,
                    onSelect: () => openList(list),
                  },
                  ...(list.owner_email === data?.email
                    ? [
                        {
                          label: "Eliminar lista",
                          icon: RiDeleteBin6Line,
                          destructive: true,
                          disabled: !!deletingId,
                          onSelect: () => setListToDelete(list),
                        },
                      ]
                    : []),
                ]}
              />
            </div>
            <p className="text-sm text-zinc-500">
              {list.owner_email === data?.email
                ? "Tu lista en curso"
                : `Compartida por ${list.owner_email}`}
            </p>
          </article>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="page-heading">Carritos</h1>
          <button className="btn-primary" onClick={() => setOpen(true)}>
            Crear
          </button>
        </div>
        <p className="page-description">
          Tus carritos en curso, compartidos e invitaciones.
        </p>
      </div>
      {error ? (
        <div role="alert" className="panel space-y-3">
          <p>{error}</p>
          <button
            className="btn-secondary"
            onClick={() => {
              setError("");
              setAttempt((value) => value + 1);
            }}
          >
            Reintentar
          </button>
        </div>
      ) : !data ? (
        <p role="status">Cargando tus listas…</p>
      ) : (
        <>
          <section className="space-y-4" aria-labelledby="own-lists">
            <h2 id="own-lists" className="text-xl font-semibold">
              Mis listas
            </h2>
            {own.length ? (
              cards(own)
            ) : (
              <p className="panel text-zinc-500">
                Todavía no tienes una lista propia. Usa Crear para
                comenzar.
              </p>
            )}
          </section>
          <section className="space-y-4" aria-labelledby="shared-lists">
            <h2 id="shared-lists" className="text-xl font-semibold">
              Compartidas conmigo
            </h2>
            {shared.length ? (
              cards(shared)
            ) : (
              <p className="text-zinc-500">
                No tienes listas compartidas aceptadas.
              </p>
            )}
          </section>
          {data.invitations.length > 0 && (
            <section className="space-y-4" aria-labelledby="pending-lists">
              <h2 id="pending-lists" className="text-xl font-semibold">
                Invitaciones pendientes
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {data.invitations.map((invite) => (
                  <article key={invite.id} className="panel space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="min-w-0 break-words text-lg font-semibold">
                        {invite.name}
                      </h3>
                      <Link
                        href={`/lists/${invite.slug}`}
                        className="btn-secondary shrink-0"
                        aria-label={`Ver invitación a ${invite.name}`}
                      >
                        Ver invitación
                      </Link>
                    </div>
                    <p className="text-sm text-zinc-500">
                      {invite.owner_email} te invitó. Aún no tienes acceso a sus
                      productos.
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {deleteError && (
        <p role="alert" className="error-notice">
          {deleteError}
        </p>
      )}
      {open && (
        <CreateListModal
          defaultName={defaultName}
          onClose={() => setOpen(false)}
        />
      )}
      <ConfirmModal
        isOpen={!!listToDelete}
        title="Eliminar lista"
        message={
          listToDelete
            ? `¿Eliminar la lista “${listToDelete.name}”? Se borrarán sus compras, historial e invitaciones. Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar lista"
        destructive
        busy={!!deletingId}
        onClose={() => {
          if (!deletingId) setListToDelete(null);
        }}
        onConfirm={() => {
          if (listToDelete)
            void deleteList(listToDelete).then((deleted) => {
              if (deleted) setListToDelete(null);
            });
        }}
      />
    </div>
  );
}
