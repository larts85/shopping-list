"use client";
import { setActiveListId } from "@/app/lib/listClient";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
} from "@/app/actions/households";
import ActionMenu from "@/shared/components/ui/ActionMenu";
import ConfirmModal from "@/shared/components/ui/ConfirmModal";
import { RiCheckLine, RiCloseLine } from "react-icons/ri";
type Invite = Awaited<ReturnType<typeof getPendingInvitations>>[number];
export default function InvitationBanner() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [invitationToAccept, setInvitationToAccept] = useState<Invite | null>(null);
  const router = useRouter();
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await getPendingInvitations();
        if (active) setInvites(data);
      } catch {
        if (active)
          setError(
            "No pudimos consultar las invitaciones. Recarga para intentar nuevamente.",
          );
      }
    };
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60000);
    window.addEventListener("focus", load);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, []);
  async function respond(id: string, accept: boolean) {
    setBusy(true);
    setError("");
    try {
      const accepted = accept ? await acceptInvitation(id) : undefined;
      if (!accept) await declineInvitation(id);
      setInvites(await getPendingInvitations());
      if (accepted) {
        setActiveListId(accepted.id);
        window.dispatchEvent(new Event("active-list-changed"));
        router.push(`/lists/${accepted.slug}`);
        router.refresh();
      }
    } catch {
      setError("No pudimos responder a la invitación. Intenta nuevamente.");
    } finally {
      setBusy(false);
    }
  }
  if (!invites.length && !error) return null;
  return (
    <section
      aria-label="Invitaciones recibidas"
      className="panel mb-6 space-y-3"
      role="status"
    >
      <h2 className="font-semibold">Invitaciones a listas compartidas</h2>
      {invites.map((i) => (
        <div key={i.id} className="flex flex-wrap items-center gap-3">
          <p>
            {i.owner_email} te invitó a <strong>{i.name}</strong>. Al aceptar
            podrás sugerir cambios.
          </p>
          <div className="hidden shrink-0 items-center gap-3 md:flex">
            <button
              disabled={busy}
              className="btn-primary"
              onClick={() => setInvitationToAccept(i)}
            >
              Aceptar y abrir
            </button>
            <button
              disabled={busy}
              className="btn-secondary"
              onClick={() => void respond(i.id, false)}
            >
              Rechazar
            </button>
          </div>
          <ActionMenu
            label={`Acciones de la invitación a ${i.name}`}
            items={[
              {
                label: "Aceptar y abrir lista",
                icon: RiCheckLine,
                disabled: busy,
                onSelect: () => setInvitationToAccept(i),
              },
              {
                label: "Rechazar invitación",
                icon: RiCloseLine,
                disabled: busy,
                destructive: true,
                onSelect: () => void respond(i.id, false),
              },
            ]}
          />
        </div>
      ))}
      {error && (
        <p role="alert" className="error-notice">
          {error}
        </p>
      )}
      <ConfirmModal
        isOpen={!!invitationToAccept}
        title="Aceptar invitación"
        message="Abrir la lista compartida descarta los cambios sin guardar de la pantalla actual. ¿Continuar?"
        confirmLabel="Aceptar y abrir"
        busy={busy}
        onClose={() => {
          if (!busy) setInvitationToAccept(null);
        }}
        onConfirm={() => {
          if (!invitationToAccept) return;
          const id = invitationToAccept.id;
          setInvitationToAccept(null);
          void respond(id, true);
        }}
      />
    </section>
  );
}
