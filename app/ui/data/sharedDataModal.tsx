"use client";
import { getActiveListId } from "@/app/lib/listClient";
import { useState } from "react";
import { shareHousehold } from "../../actions/households";
export default function SharedDataModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: (shared?: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [delivery, setDelivery] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4"
      >
        <h2 id="share-title" className="text-2xl font-semibold">
          Compartir lista
        </h2>
        <p>
          La persona debe ingresar con el correo invitado y aceptar la
          notificación. Podrá ver esta lista y su historial, y sugerir cambios.
          El propietario de la lista debe aprobarlos.
        </p>
        {!delivery ? (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const result = await shareHousehold(email, getActiveListId());
                setLink(
                  new URL(
                    `/logistic/lists/${result.slug}`,
                    window.location.origin,
                  ).href,
                );
                setEmail(result.email);
                setDelivery(result.delivery);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "No se pudo compartir",
                );
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
                className="field mt-2"
              />
            </label>
            {error && (
              <p role="alert" className="error-notice">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                className="btn-secondary"
                type="button"
                onClick={() => onClose()}
              >
                Cancelar
              </button>
              <button disabled={busy} className="btn-primary">
                {busy ? "Guardando…" : "Crear invitación"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p role="status">
              {delivery === "sent"
                ? "Invitación guardada. El proveedor aceptó el correo para su envío; revisa también spam."
                : delivery === "failed"
                  ? "La invitación quedó guardada, pero el correo no se pudo enviar. Comparte el enlace para que la persona ingrese y la acepte."
                  : "Invitación guardada. No se envió un correo porque el envío automático todavía no está configurado. Comparte el enlace para que la persona ingrese y la acepte."}
            </p>
            <label className="block">
              Enlace para ingresar
              <input readOnly className="field mt-2" value={link} />
            </label>
            <button
              className="btn-secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                } catch {
                  setError("No pudimos copiar el enlace.");
                }
              }}
            >
              {copied ? "Enlace copiado" : "Copiar enlace de la invitación"}
            </button>
            {error && (
              <p role="alert" className="error-notice">
                {error}
              </p>
            )}
            <a
              className="btn-secondary inline-flex"
              href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent("Invitación a una lista de compras")}&body=${encodeURIComponent(`Te invité a mi lista de compras. Ingresa con este correo y acepta la invitación: ${link}`)}`}
            >
              Preparar correo en mi aplicación
            </a>
            <button className="btn-primary" onClick={() => onClose(true)}>
              Listo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
