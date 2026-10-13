"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearActiveListId, getActiveListId } from "@/app/lib/listClient";
import {
  acceptInvitation,
  declineInvitation,
  reviewHouseholdName,
  type getHomeLists,
} from "@/app/actions/households";
import { setActiveListId } from "@/app/lib/listClient";
import CreateListModal from "./createListModal";
type Data = Awaited<ReturnType<typeof getHomeLists>>;
export default function HomeLists({ defaultName }: { defaultName: string }) {
  const [data, setData] = useState<Data>();
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [deletingId, setDeletingId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [respondingId, setRespondingId] = useState("");
  const [notificationError, setNotificationError] = useState("");
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
  async function deleteList(list: Data["lists"][number]) {
    if (
      !window.confirm(
        `¿Eliminar la lista “${list.name}”? Se borrarán sus compras, historial e invitaciones. Esta acción no se puede deshacer.`,
      )
    )
      return;
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
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "No pudimos eliminar la lista.",
      );
    } finally {
      setDeletingId("");
    }
  }
  async function respondToInvitation(
    invitation: Data["invitations"][number],
    accept: boolean,
  ) {
    setRespondingId(invitation.id);
    setNotificationError("");
    try {
      if (accept) {
        const list = await acceptInvitation(invitation.id);
        setActiveListId(list.id);
        window.dispatchEvent(new Event("active-list-changed"));
        router.push(`/lists/${list.slug}`);
        router.refresh();
      } else {
        await declineInvitation(invitation.id);
        setData((previous) =>
          previous
            ? {
                ...previous,
                invitations: previous.invitations.filter(
                  (item) => item.id !== invitation.id,
                ),
              }
            : previous,
        );
        window.dispatchEvent(new Event("active-list-changed"));
      }
    } catch (error) {
      setNotificationError(
        error instanceof Error
          ? error.message
          : "No pudimos responder a la invitación.",
      );
    } finally {
      setRespondingId("");
    }
  }
  async function reviewNameSuggestion(
    suggestion: Data["pendingNameSuggestions"][number],
    decision: "approve" | "reject",
  ) {
    setRespondingId(suggestion.id);
    setNotificationError("");
    try {
      await reviewHouseholdName(
        suggestion.id,
        decision,
        suggestion.household_id,
      );
      setData((previous) =>
        previous
          ? {
              ...previous,
              lists:
                decision === "approve"
                  ? previous.lists.map((list) =>
                      list.id === suggestion.household_id
                        ? { ...list, name: suggestion.name }
                        : list,
                    )
                  : previous.lists,
              pendingNameSuggestions: previous.pendingNameSuggestions.filter(
                (item) => item.id !== suggestion.id,
              ),
            }
          : previous,
      );
      window.dispatchEvent(new Event("active-list-changed"));
      router.refresh();
    } catch (error) {
      setNotificationError(
        error instanceof Error
          ? error.message
          : "No pudimos revisar la sugerencia de nombre.",
      );
    } finally {
      setRespondingId("");
    }
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
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/lists/${list.slug}`}
                  className="btn-secondary"
                  aria-label={`Abrir ${list.name}`}
                >
                  Abrir
                </Link>
                {list.owner_email === data?.email && (
                  <button
                    type="button"
                    className="btn-secondary text-red-700 hover:bg-red-50"
                    disabled={!!deletingId}
                    onClick={() => void deleteList(list)}
                  >
                    {deletingId === list.id ? "Eliminando…" : "Eliminar"}
                  </button>
                )}
              </div>
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
          {data.pendingNameSuggestions.length > 0 && (
            <section className="space-y-4" aria-labelledby="pending-name-suggestions">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="pending-name-suggestions" className="text-xl font-semibold">
                  Cambios de nombre pendientes
                  <span className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-100 px-2 text-xs font-bold text-amber-950 ring-1 ring-inset ring-amber-300">
                    {data.pendingNameSuggestions.length}
                  </span>
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {data.pendingNameSuggestions.map((suggestion) => (
                  <article key={suggestion.id} className="panel space-y-3">
                    <div>
                      <h3 className="font-semibold">{suggestion.list_name}</h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        {suggestion.email} propone “{suggestion.name}”.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href="/data"
                        className="btn-secondary"
                        onClick={() => {
                          setActiveListId(suggestion.household_id);
                          window.dispatchEvent(new Event("active-list-changed"));
                        }}
                      >
                        Ver en Accesos
                      </Link>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={!!respondingId}
                        onClick={() =>
                          void reviewNameSuggestion(suggestion, "approve")
                        }
                      >
                        {respondingId === suggestion.id ? "Guardando…" : "Aceptar nombre"}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={!!respondingId}
                        onClick={() =>
                          void reviewNameSuggestion(suggestion, "reject")
                        }
                      >
                        Rechazar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
          {data.invitations.length > 0 && (
            <section className="space-y-4" aria-labelledby="pending-lists">
              <h2 id="pending-lists" className="text-xl font-semibold">
                Invitaciones pendientes
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {data.invitations.map((invite) => (
                  <article key={invite.id} className="panel space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="min-w-0 break-words text-lg font-semibold">
                        {invite.name}
                      </h3>
                    </div>
                    <p className="text-sm text-zinc-500">
                      {invite.owner_email} te invitó. Aún no tienes acceso a sus
                      productos.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={!!respondingId}
                        onClick={() => void respondToInvitation(invite, true)}
                      >
                        {respondingId === invite.id ? "Abriendo…" : "Aceptar y abrir"}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={!!respondingId}
                        onClick={() => void respondToInvitation(invite, false)}
                      >
                        Rechazar
                      </button>
                      <Link
                        href={`/lists/${invite.slug}`}
                        className="btn-secondary"
                        aria-label={`Abrir detalles de la invitación a ${invite.name}`}
                      >
                        Ver detalles
                      </Link>
                    </div>
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
      {notificationError && (
        <p role="alert" className="error-notice">
          {notificationError}
        </p>
      )}
      {open && (
        <CreateListModal
          defaultName={defaultName}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
