"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

type ConsentProps = {
  authorizationId: string;
  authUrl: string;
  publishableKey: string;
};

type AuthorizationDetails = {
  authorization_id: string;
  client: { name?: string };
  redirect_uri: string;
  scope: string;
};

export default function Consent({
  authorizationId,
  authUrl,
  publishableKey,
}: ConsentProps) {
  const supabase = useMemo<SupabaseClient | null>(() => {
    if (!authUrl || !publishableKey) return null;
    return createClient(authUrl, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }, [authUrl, publishableKey]);
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase || !authorizationId) return;
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setError("No se pudo comprobar tu sesión.");
        return;
      }
      if (!data.session) return;

      setEmail(data.session.user.email ?? "");
      const { data: authorization, error: authorizationError } =
        await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (cancelled) return;
      if (authorizationError) {
        setError("Esta solicitud venció o ya no está disponible.");
        return;
      }
      if (authorization && "redirect_url" in authorization) {
        window.location.assign(authorization.redirect_url);
        return;
      }
      if (authorization && "authorization_id" in authorization)
        setDetails(authorization);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [authorizationId, supabase]);

  async function signIn() {
    if (!supabase) return;
    setBusy(true);
    setError("");
    const redirectTo = `${window.location.origin}/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (signInError) {
      setError("No se pudo iniciar sesión con Google.");
      setBusy(false);
    }
  }

  async function decide(approved: boolean) {
    if (!supabase) return;
    setBusy(true);
    setError("");
    const action = approved
      ? supabase.auth.oauth.approveAuthorization
      : supabase.auth.oauth.denyAuthorization;
    const { data, error: decisionError } = await action(authorizationId, {
      skipBrowserRedirect: true,
    });
    if (decisionError || !data?.redirect_url) {
      setError("No se pudo guardar tu decisión. Vuelve a cargar la página.");
      setBusy(false);
      return;
    }
    window.location.assign(data.redirect_url);
  }

  if (!authorizationId)
    return <main className="mx-auto max-w-lg p-8">La solicitud de autorización no es válida.</main>;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-5 py-12">
      <section className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">Home Logistics</p>
        <h1 className="mt-2 text-2xl font-semibold">Conectar con ChatGPT</h1>
        {!supabase ? (
          <p className="mt-5 text-sm text-red-700">La autorización todavía no está configurada.</p>
        ) : !email ? (
          <>
            <p className="mt-4 text-sm text-slate-700">
              Inicia sesión con la cuenta de Google vinculada a tu hogar para continuar.
            </p>
            <button
              className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-3 font-medium text-white disabled:opacity-50"
              disabled={busy}
              onClick={signIn}
              type="button"
            >
              {busy ? "Abriendo Google…" : "Continuar con Google"}
            </button>
          </>
        ) : details ? (
          <>
            <p className="mt-4 text-sm text-slate-700">
              <strong>{details.client.name ?? "Una aplicación"}</strong> solicita acceso para operar tus listas como {email}.
            </p>
            <p className="mt-4 text-sm text-slate-700">Permisos solicitados: {details.scope || "perfil"}</p>
            <p className="mt-3 break-all text-xs text-slate-500">Destino: {details.redirect_uri}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                className="rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-800 disabled:opacity-50"
                disabled={busy}
                onClick={() => void decide(false)}
                type="button"
              >
                Rechazar
              </button>
              <button
                className="rounded-lg bg-slate-900 px-4 py-3 font-medium text-white disabled:opacity-50"
                disabled={busy}
                onClick={() => void decide(true)}
                type="button"
              >
                {busy ? "Guardando…" : "Autorizar"}
              </button>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-slate-700">Cargando la solicitud de acceso…</p>
        )}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      </section>
    </main>
  );
}
