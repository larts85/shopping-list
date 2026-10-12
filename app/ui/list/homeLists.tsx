"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { getHomeLists } from "@/app/actions/households";
import CreateListModal from "./createListModal";
type Data = Awaited<ReturnType<typeof getHomeLists>>;
export default function HomeLists({ defaultName }: { defaultName: string }) {
  const [data, setData] = useState<Data>();
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
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
  function cards(lists: Data["lists"]) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {lists.map((list) => (
          <Link
            key={list.id}
            href={`/logistic/lists/${list.slug}`}
            className="panel block space-y-2 transition-colors hover:border-zinc-400"
          >
            <h3 className="text-lg font-semibold">{list.name}</h3>
            <p className="text-sm text-zinc-500">
              {list.owner_email === data?.email
                ? "Tu lista en curso"
                : `Compartida por ${list.owner_email}`}
            </p>
            <span className="text-sm underline">Abrir lista</span>
          </Link>
        ))}
      </div>
    );
  }
  return (
    <div className="mt-8 space-y-8">
      <button className="btn-primary" onClick={() => setOpen(true)}>
        Crear lista
      </button>
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
                Todavía no tienes una lista propia. Usa Crear lista para
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
                  <Link
                    key={invite.id}
                    href={`/logistic/lists/${invite.slug}`}
                    className="panel block space-y-2"
                  >
                    <h3 className="text-lg font-semibold">{invite.name}</h3>
                    <p className="text-sm text-zinc-500">
                      {invite.owner_email} te invitó. Aún no tienes acceso a sus
                      productos.
                    </p>
                    <span className="text-sm underline">Ver invitación</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
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
