"use client";

import Link from "next/link";
import InvitationBanner from "./invitationBanner";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { resolveListSlug } from "@/app/actions/households";
import { acceptInvitation } from "@/app/actions/households";
import { getHouseholdData } from "@/app/actions/households";
import { getActiveListId, setActiveListId } from "@/app/lib/listClient";

async function resolveLinkedList(
  slug: string,
): Promise<Awaited<ReturnType<typeof resolveListSlug>>> {
  const response = await fetch(
    `/api/households?slug=${encodeURIComponent(slug)}`,
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
  const requiresList =
    pathname !== "/logistic" &&
    pathname !== "/logistic/catalog" &&
    !pathname.startsWith("/logistic/admin");
  const slug = pathname.startsWith("/logistic/lists/")
    ? pathname.slice("/logistic/lists/".length)
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
        const active =
          linked?.kind === "member" ? linked.id : getActiveListId();
        let data: Awaited<ReturnType<typeof getHouseholdData>>;
        if (linked?.kind === "member") {
          const response = await fetch("/api/households", {
            cache: "no-store",
            headers: { "X-List-ID": linked.id },
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(
              result.error ||
                "No pudimos cargar esta lista. Intenta nuevamente.",
            );
          data = result;
        } else {
          let response = await fetch("/api/households", {
            cache: "no-store",
            headers: active ? { "X-List-ID": active } : {},
          });
          if (!response.ok && active)
            response = await fetch("/api/households", { cache: "no-store" });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.error || "No pudimos cargar tus listas.");
          data = result;
        }
        if (cancelled) return;
        setActiveListId(data.household.id);
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
          Podrás editar artículos y sugerir un nombre al propietario.
        </p>
        <button
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
        <Link href="/logistic" className="text-sm underline">
          Volver a Home
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
