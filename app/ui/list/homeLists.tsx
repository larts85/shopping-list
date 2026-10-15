"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearActiveListId,
  getActiveListId,
  setActiveListId,
} from "@/app/lib/listClient";
import {
  acceptInvitation,
  declineInvitation,
  reviewHouseholdName,
} from "@/app/actions/households";
import type { getHomeLists } from "@/app/actions/households";
import CreateListModal from "./createListModal";
import ActionMenu from "@/shared/components/ui/ActionMenu";
import ConfirmModal from "@/shared/components/ui/ConfirmModal";
import {
  RiArrowRightLine,
  RiCalendarEventLine,
  RiDeleteBin6Line,
} from "react-icons/ri";
import ScheduleListModal from "./scheduleListModal";
type Data = Awaited<ReturnType<typeof getHomeLists>>;
export default function HomeLists({ defaultName }: { defaultName: string }) {
  const [data, setData] = useState<Data>();
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [deletingId, setDeletingId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [listToDelete, setListToDelete] = useState<
    Data["lists"][number] | null
  >(null);
  const [scheduleList, setScheduleList] = useState<{
    name: string;
    url: string;
  }>();
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
        error instanceof Error
          ? error.message
          : "No pudimos eliminar la lista.",
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
          <article
            key={list.id}
            className="panel relative space-y-1.5 p-3.5 sm:p-4"
          >
            <Link
              href={`/lists/${list.slug}`}
              className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-700"
              aria-label={`Abrir ${list.name}`}
              onClick={() => {
                setActiveListId(list.id);
                window.dispatchEvent(new Event("active-list-changed"));
              }}
            />
            <div className="pointer-events-none relative z-10 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1">
              <h3 className="min-w-0 break-words text-base font-semibold leading-6">
                {list.name}
              </h3>
              <div className="pointer-events-auto col-start-2 row-span-2 flex shrink-0 items-center gap-1">
                <div className="hidden gap-1 md:flex">
                  {list.owner_email === data?.email && (
                    <button
                      type="button"
                      className="icon-button size-10 text-red-700 hover:bg-red-50 hover:text-red-800"
                      disabled={!!deletingId}
                      aria-label={
                        deletingId === list.id
                          ? `Eliminando ${list.name}`
                          : `Eliminar ${list.name}`
                      }
                      title={
                        deletingId === list.id
                          ? "Eliminando…"
                          : "Eliminar lista"
                      }
                      onClick={() => setListToDelete(list)}
                    >
                      <RiDeleteBin6Line aria-hidden="true" size={20} />
                    </button>
                  )}
                </div>
                <ActionMenu
                  alwaysVisible
                  label={`Acciones para la lista ${list.name}`}
                  items={[
                    {
                      label: "Abrir lista",
                      icon: RiArrowRightLine,
                      onSelect: () => openList(list),
                    },
                    {
                      label: "Agendar en Google Calendar",
                      icon: RiCalendarEventLine,
                      onSelect: () =>
                        setScheduleList({
                          name: list.name,
                          url: `${window.location.origin}/lists/${list.slug}`,
                        }),
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
              <p className="pointer-events-none col-start-1 row-start-2 text-sm leading-5 text-zinc-500">
                {list.owner_email === data?.email
                  ? "Tu lista en curso"
                  : `Compartida por ${list.owner_email}`}
              </p>
            </div>
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
                Todavía no tienes una lista propia. Usa Crear para comenzar.
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
            <section
              className="space-y-4"
              aria-labelledby="pending-name-suggestions"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2
                  id="pending-name-suggestions"
                  className="text-xl font-semibold"
                >
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
                          window.dispatchEvent(
                            new Event("active-list-changed"),
                          );
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
                        {respondingId === suggestion.id
                          ? "Guardando…"
                          : "Aceptar nombre"}
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
                        {respondingId === invite.id
                          ? "Abriendo…"
                          : "Aceptar y abrir"}
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
      {scheduleList && (
        <ScheduleListModal
          listName={scheduleList.name}
          listUrl={scheduleList.url}
          onClose={() => setScheduleList(undefined)}
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

HomeLists.displayName = 'HomeLists';
