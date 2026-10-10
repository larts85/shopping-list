"use client";
import { useState } from "react";
import { shareHousehold } from "../../actions/households";
export default function SharedDataModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        className="bg-white p-10 max-w-lg w-full"
      >
        <h2 id="share-title" className="text-3xl mb-8">
          Compartir datos del hogar
        </h2>
        <p className="mb-4">
          La invitación aparecerá cuando esa persona ingrese con su cuenta de
          Google. Podrá editar las categorías, productos y compras del hogar.
        </p>
        <form
          className="space-y-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await shareHousehold(email);
              onClose();
            } catch (e) {
              setError(e instanceof Error ? e.message : "No se pudo compartir");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300"
            />
          </label>
          {error && (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose}>
              Cancelar
            </button>
            <button
              disabled={busy}
              type="submit"
              className="bg-black text-white p-3"
            >
              {busy ? "Guardando…" : "Compartir"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
