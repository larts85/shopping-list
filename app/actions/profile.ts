"use server";
import { withCatalog, appRole, DataError, text } from "../lib/database";
export async function getCurrentUser() {
  return withCatalog(async (db, email) => ({
    email,
    role: await appRole(db, email),
  }));
}

export async function getAppUsers() {
  return withCatalog(async (db) =>
    (
      await db.query("select email,role from app_users order by email")
    ).rows as { email: string; role: "admin" | "user" }[],
  true);
}

export async function updateAppUserRole(
  rawEmail: unknown,
  role: unknown,
): Promise<void> {
  const email = text(rawEmail).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new DataError("Correo inválido");
  if (role !== "admin" && role !== "user")
    throw new DataError("Rol inválido");
  return withCatalog(async (db, actor) => {
    if (actor === email && role !== "admin")
      throw new DataError("No puedes quitarte el rol de administrador", 409);
    const updated = await db.query(
      "update app_users set role=$2 where email=$1 returning email",
      [email, role],
    );
    if (!updated.rowCount) throw new DataError("El usuario no existe", 404);
  }, true);
}
