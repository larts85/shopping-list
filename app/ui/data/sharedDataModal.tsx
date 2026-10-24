"use client";
import { getActiveListId } from "@/app/lib/listClient";
import { useState } from "react";
import { shareList } from "../../actions/lists";
import type { ListAccessRole } from "@/app/lib/database";
export default function SharedDataModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: (shared?: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [accessRole, setAccessRole] = useState<ListAccessRole | "">("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [delivery, setDelivery] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const shareMessage = `Te compartí una lista de compras en Shopear. Para acceder, inicia sesión con ${email} y acepta la invitación. Luego podrás abrirla desde este enlace: ${link}`;
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
          invitación. Elige qué permisos tendrá en esta lista.
        </p>
        {!delivery ? (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const result = await shareList(
                  email,
                  getActiveListId(),
                  accessRole,
                );
                if (result.status === "error") {
                  setError(result.error);
                  return;
                }
                setLink(
                  new URL(`/lists/${result.slug}`, window.location.origin).href,
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
            <label className="block">
              Tipo de acceso
              <select
                className="field mt-2"
                value={accessRole}
                onChange={(event) => setAccessRole(event.target.value as ListAccessRole | "")}
                required
                disabled={busy}
              >
                <option value="" disabled>Selecciona un tipo de acceso</option>
                <option value="list_viewer">Solo lectura</option>
                <option value="list_editor">Editor de la lista</option>
              </select>
              <span className="mt-2 block text-sm text-zinc-500">
                {accessRole === "list_editor"
                  ? "Podrá editar artículos y enviar sugerencias. El cierre de compras y la administración de accesos siguen reservados al propietario."
                  : "Podrá consultar la lista y su historial, pero no podrá editar artículos ni enviar sugerencias."}
              </span>
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
                ? `Invitación guardada como ${accessRole === "list_editor" ? "editor de la lista" : "solo lectura"}. El proveedor aceptó el correo para su envío; revisa también spam.`
                : delivery === "failed"
                  ? `Invitación guardada como ${accessRole === "list_editor" ? "editor de la lista" : "solo lectura"}, pero el correo no se pudo enviar. Comparte el enlace para que la persona ingrese y la acepte.`
                  : `Invitación guardada como ${accessRole === "list_editor" ? "editor de la lista" : "solo lectura"}. No se envió un correo porque el envío automático todavía no está configurado. Comparte el enlace para que la persona ingrese y la acepte.`}
            </p>
            <label className="block">
              Enlace para ingresar
              <input readOnly className="field mt-2" value={link} />
            </label>
            <button
              className="btn-secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareMessage);
                  setCopied(true);
                } catch {
                  setError("No pudimos copiar el mensaje.");
                }
              }}
            >
              {copied ? "Mensaje copiado" : "Copiar mensaje para compartir"}
            </button>
            {error && (
              <p role="alert" className="error-notice">
                {error}
              </p>
            )}
            <a
              className="btn-secondary inline-flex"
              href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent("Invitación a una lista de compras")}&body=${encodeURIComponent(shareMessage)}`}
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

SharedDataModal.displayName = 'SharedDataModal';
