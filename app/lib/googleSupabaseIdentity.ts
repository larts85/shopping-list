import { createClient } from "@supabase/supabase-js";
export async function verifySupabaseGoogleIdentity(
  idToken: string,
  expectedEmail: string,
  environment: Record<string, string | undefined> = process.env,
  authenticate?: (
    token: string,
  ) => Promise<{
    id: string;
    email?: string;
    email_confirmed_at?: string;
    identities?: { provider: string }[];
  }>,
): Promise<{ id: string; email: string }> {
  const url = environment.SUPABASE_AUTH_URL,
    key = environment.SUPABASE_AUTH_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase Auth no está configurado");
  const endpoint = new URL(url);
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password)
    throw new Error("URL de Supabase Auth inválida");
  if (!idToken) throw new Error("Falta la identidad verificada de Google");
  const signIn =
    authenticate ??
    (async (token: string) => {
      const client = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
      const { data, error } = await client.auth.signInWithIdToken({
        provider: "google",
        token,
      });
      if (error || !data.user)
        throw new Error("Supabase no pudo verificar la identidad de Google");
      return data.user;
    });
  const user = await signIn(idToken);
  const email = user.email?.toLowerCase();
  if (
    !user.id ||
    !user.email_confirmed_at ||
    email !== expectedEmail.toLowerCase() ||
    !user.identities?.some((i) => i.provider === "google")
  )
    throw new Error("La identidad de Supabase no coincide con Google");
  return { id: user.id, email };
}
