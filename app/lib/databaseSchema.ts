export function databaseSchema(
  environment: Record<string, string | undefined> = process.env,
): "public" | "preview_lists" {
  const configured = environment.SUPABASE_DB_SCHEMA;
  if (environment.VERCEL_ENV === "preview" && configured !== "preview_lists")
    throw new Error("Preview requiere SUPABASE_DB_SCHEMA=preview_lists");
  if (
    configured !== undefined &&
    configured !== "public" &&
    configured !== "preview_lists"
  )
    throw new Error("SUPABASE_DB_SCHEMA inválido");
  return configured === "preview_lists" ? "preview_lists" : "public";
}
