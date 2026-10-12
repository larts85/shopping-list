"use client";
import Link from "next/link";
import { getActiveListId } from "@/app/lib/listClient";
import { useEffect, useState } from "react";
import { getHouseholdData } from "@/app/actions/households";
import SharedDataModal from "../data/sharedDataModal";
type Data = Awaited<ReturnType<typeof getHouseholdData>>;
export default function SharedListControls({
  onSwitch,
}: {
  onSwitch: () => Promise<void>;
}) {
  const [data, setData] = useState<Data>();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    try {
      setData(await getHouseholdData(getActiveListId()));
      setError("");
    } catch {
      setError("No pudimos cargar los accesos de la lista.");
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
  return (
    <section className="panel space-y-4" aria-label="Accesos de la lista">
      {error && (
        <p role="alert" className="error-notice">
          {error}
        </p>
      )}
      {data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{data.household.name}</h2>
            <div className="flex flex-wrap gap-3">
              <Link className="btn-secondary" href="/logistic">
                Home
              </Link>
              {data.canManageList && (
                <button className="btn-secondary" onClick={() => setOpen(true)}>
                  Compartir lista
                </button>
              )}
              <Link className="text-sm underline" href="/logistic/data">
                Accesos y nombre
              </Link>
            </div>
          </div>
          <p className="text-sm text-zinc-500">
            {data.memberCount}{" "}
            {data.memberCount === 1 ? "persona tiene" : "personas tienen"}{" "}
            acceso.{" "}
            {data.canManageList
              ? "Puedes gestionar esta lista."
              : "Puedes editar artículos y sugerir un nombre al propietario."}
          </p>
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
    </section>
  );
}
