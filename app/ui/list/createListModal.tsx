"use client";
import Modal from "@/shared/components/ui/Modal";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { setActiveListId } from "@/app/lib/listClient";
export default function CreateListModal({
  defaultName,
  onClose,
}: {
  defaultName: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function create(useDefault: boolean) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/households", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          ...(useDefault ? {} : { name }),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "No pudimos crear la lista.");
      setActiveListId(result.result);
      window.dispatchEvent(new Event("active-list-changed"));
      onClose();
      router.push(`/lists/${result.slug}`);
      router.refresh();
    } catch (error) {
      setError(
        `No se pudo confirmar la creación. La lista anterior sigue activa. ${error instanceof Error ? error.message : "No pudimos crear la lista."}`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      isOpen
      title="Crear lista"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="space-y-4">
        <h2 id="create-list-title" className="text-2xl font-semibold">
          Crear lista
        </h2>
        <p>
          Elige un nombre o usa <strong>{defaultName}</strong>. Tus otras listas
          se conservarán.
        </p>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void create(false);
          }}
        >
          <label className="block">
            Nombre de la lista
            <input
              autoFocus
              className="field mt-2"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={200}
              placeholder={defaultName}
              disabled={busy}
            />
          </label>
          {error && (
            <p role="alert" className="error-notice">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => void create(true)}
            >
              Usar predeterminado
            </button>
            <button className="btn-primary" disabled={busy || !name.trim()}>
              {busy ? "Creando…" : "Crear con este nombre"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

CreateListModal.displayName = 'CreateListModal';
