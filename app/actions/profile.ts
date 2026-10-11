"use server";
import { withCatalog, appRole } from "../lib/database";
export async function getCurrentUser() {
  return withCatalog(async (db, email) => ({
    email,
    role: await appRole(db, email),
  }));
}
