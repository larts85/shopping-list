"use client";

import Link from "next/link";
import InvitationBanner from "./invitationBanner";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { resolveListSlug } from "@/app/actions/lists";
import {
  acceptInvitation,
  declineInvitation,
} from "@/app/actions/lists";
import { getListData } from "@/app/actions/lists";
import { getActiveListId, setActiveListId } from "@/app/lib/listClient";

async function resolveLinkedList(
  slug: string,
): Promise<Awaited<ReturnType<typeof resolveListSlug>>> {
  const response = await fetch(
    `/api/lists?slug=${encodeURIComponent(slug)}`,
    { cache: "no-store" },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "No pudimos abrir esta lista.");
  return result;
}

export default function ListAccessProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const requiresList =
    pathname !== "/" &&
    pathname !== "/catalog" &&
    pathname !== "/history" &&
    !pathname.startsWith("/admin");
  const slug = pathname.startsWith("/lists/")
    ? pathname.slice("/lists/".length)
    : undefined;
  const [readyPath, setReadyPath] = useState("");
  const [invitation, setInvitation] =
    useState<
      Extract<
        Awaited<ReturnType<typeof resolveListSlug>>,
        { kind: "invitation" }
      >
    >();
  const [error, setError] = useState("");
  const [invitationError, setInvitationError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!requiresList) return;
    let cancelled = false;
    async function initialize() {
      try {
        setReadyPath("");
        setError("");
        setInvitation(undefined);
        const linked = slug ? await resolveLinkedList(slug) : undefined;
        if (cancelled) return;
        if (linked?.kind === "invitation") {
          setInvitation(linked);
          return;
        }
        if (linked?.kind === "member") {
          // The list page fetches page-data next, which revalidates membership
          // before returning any rows. Avoid loading  list metadata here;
          // this provider does not use it for a slug-backed list.
          setActiveListId(linked.id);
          setReadyPath(pathname);
          return;
        }
        const active = getActiveListId();
        let response = await fetch("/api/lists", {
          cache: "no-store",
          headers: active ? { "X-List-ID": active } : {},
        });
        if (!response.ok && active)
          response = await fetch("/api/lists", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "No pudimos cargar tus listas.");
        const data: Awaited<ReturnType<typeof getListData>> = result;
        if (cancelled) return;
        setActiveListId(data. list.id);
        setReadyPath(pathname);
        setError("");
      } catch (error) {
        if (!cancelled)
          setError(
            error instanceof Error
              ? error.message
              : "No pudimos cargar tus listas.",
          );
      }
    }
    void initialize();
    return () => {
      cancelled = true;
    };
  }, [attempt, pathname, slug, requiresList]);

  if (!requiresList) return children;
  if (invitation)
    return (
      <section className="panel space-y-3">
        <p>
          {invitation.owner} te invitó a <strong>{invitation.name}</strong>.
          {invitation.role === "list_editor"
            ? " Tendrás acceso de editor: podrás editar artículos y enviar sugerencias. El cierre de compras y la administración de accesos quedan reservados al propietario."
            : " Tendrás acceso de solo lectura: podrás consultar la lista y el historial, pero no editar ni enviar sugerencias."}
        </p>
        {invitationError && (
          <p role="alert" className="error-notice">
            {invitationError}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await acceptInvitation(invitation.invitationId);
                setInvitation(undefined);
                setAttempt((value) => value + 1);
              } catch {
                setInvitation(undefined);
                setError(
                  "La invitación ya no está disponible. Solicita una nueva al propietario.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Aceptar y abrir
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setInvitationError("");
              try {
                await declineInvitation(invitation.invitationId);
                router.push("/");
                router.refresh();
              } catch {
                setInvitationError(
                  "No pudimos rechazar la invitación. Intenta nuevamente.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Rechazar
          </button>
        </div>
      </section>
    );
  if (readyPath === pathname && !error)
    return (
      <>
        <InvitationBanner />
        {children}
      </>
    );
  if (error)
    return (
      <div role="alert" className="space-y-3">
        <p>{error}</p>
        <Link href="/" className="text-sm underline">
          Volver a Carritos
        </Link>
        <button
          className="rounded-xl border px-4 py-2"
          onClick={() => {
            setReadyPath("");
            setError("");
            setAttempt((value) => value + 1);
          }}
        >
          Reintentar
        </button>
      </div>
    );
  return <p role="status">Cargando tus listas…</p>;
}

ListAccessProvider.displayName = 'ListAccessProvider';
