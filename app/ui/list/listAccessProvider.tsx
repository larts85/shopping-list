"use client";

import { useEffect, useState } from "react";
import { getHouseholdData } from "@/app/actions/households";
import { getActiveListId, setActiveListId } from "@/app/lib/listClient";

export default function ListAccessProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      try {
        const active = getActiveListId();
        const data = active
          ? await getHouseholdData(active).catch(() => getHouseholdData())
          : await getHouseholdData();
        if (cancelled) return;
        setActiveListId(data.household.id);
        setReady(true);
        setError(false);
      } catch {
        if (!cancelled) setError(true);
      }
    }
    void initialize();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (ready) return children;
  if (error)
    return (
      <div role="alert" className="space-y-3">
        <p>No pudimos cargar tus listas.</p>
        <button
          className="rounded-xl border px-4 py-2"
          onClick={() => {
            setError(false);
            setAttempt((value) => value + 1);
          }}
        >
          Reintentar
        </button>
      </div>
    );
  return <p role="status">Cargando tus listas…</p>;
}
