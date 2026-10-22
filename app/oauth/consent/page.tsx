import Consent from "./consent";

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { authorization_id: authorizationId } = await searchParams;
  return (
    <Consent
      authorizationId={
        typeof authorizationId === "string" ? authorizationId : ""
      }
      authUrl={process.env.SUPABASE_AUTH_URL ?? ""}
      publishableKey={process.env.SUPABASE_AUTH_PUBLISHABLE_KEY ?? ""}
    />
  );
}
