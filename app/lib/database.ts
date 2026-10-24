import "server-only";
import { databaseSchema } from "./databaseSchema";
import type { PoolClient } from "pg";
import { pool } from "./databaseConnection";
import { auth } from "@/auth";
import { headers } from "next/headers";

export class DataError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 200)
    throw new DataError("Texto inválido");
  return value.trim();
}
export function positive(value: unknown, allowZero = false): number {
  const number = Number(value);
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && !value.trim()) ||
    value === "" ||
    value == null ||
    !Number.isFinite(number) ||
    (allowZero ? number < 0 : number <= 0)
  )
    throw new DataError("Número inválido");
  return number;
}
export async function identity() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) throw new DataError("Inicia sesión para continuar", 401);
  return { email, session };
}
export async function transaction<T>(
  email: string,
  run: (db: PoolClient) => Promise<T>,
): Promise<T> {
  const db = await pool().connect();
  try {
    await db.query("begin");
    // Transaction-scoped only: connection reuse cannot leak a preview search_path.
    // Never include public as a fallback when preview tables are missing.
    await db.query("select set_config('search_path',$1,true)", [
      databaseSchema(),
    ]);
    await db.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [
      email,
    ]);
    await db.query(
      "insert into app_users(email,role) values($1,case when $1='larts85@gmail.com' then 'admin' else 'user' end) on conflict(email) do nothing",
      [email],
    );
    const result = await run(db);
    await db.query("commit");
    return result;
  } catch (error) {
    if (!(error instanceof DataError)) {
      const details = error as {
        code?: string;
        constraint?: string;
        name?: string;
        message?: string;
        stack?: string;
      };
      console.error("Database transaction failed", {
        schema: databaseSchema(),
        errorName: details?.name,
        errorCode: details?.code,
        constraint: details?.constraint,
        message: details?.message,
        stack: details?.stack,
      });
    }
    await db.query("rollback");
    throw error;
  } finally {
    db.release();
  }
}
export async function ensureList(
  db: PoolClient,
  email: string,
): Promise<string> {
  const current = await db.query(
    "select p.list_id from user_preferences p join list_members m on m.list_id=p.list_id and m.email=p.email join lists h on h.id=p.list_id and h.status='active' where p.email=$1",
    [email],
  );
  if (current.rowCount) return current.rows[0].list_id;
  const existing = await db.query(
    "select h.id from lists h join list_members m on m.list_id=h.id where m.email=$1 and h.status='active' order by (h.owner_email=$1) desc,h.created_at limit 1",
    [email],
  );
  if (existing.rowCount) {
    const id = existing.rows[0].id;
    await db.query(
      "insert into user_preferences(email,list_id) values($1,$2) on conflict(email) do update set list_id=excluded.list_id",
      [email, id],
    );
    return id;
  }
  throw new DataError(
    "No tienes una lista activa. Crea una lista desde Home para continuar.",
    409,
  );
}
export async function withList<T>(
  run: (db: PoolClient,  list: string, email: string) => Promise<T>,
  scope?: string,
  options: { allowCompleted?: boolean } = {},
) {
  const requestedScope =
    scope ?? (await headers()).get("X-List-ID") ?? undefined;
  if (
    requestedScope &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      requestedScope,
    )
  )
    throw new DataError("Lista inválida");
  const { email } = await identity();
  return transaction(email, async (db) => {
    const listId = requestedScope
      ? text(requestedScope).toLowerCase()
      : await ensureList(db, email);
    await db.query("select pg_advisory_xact_lock(hashtextextended($1, 1))", [
       listId,
    ]);
    // Access may have been revoked while this transaction waited for the  list lock.
    if (
      !(
        await db.query(
          "select 1 from list_members where list_id=$1 and email=$2",
          [listId, email],
        )
      ).rowCount
    )
      throw new DataError(
        "No tienes acceso a esta lista. Inicia sesión con el correo invitado o pide al propietario que te invite.",
        403,
      );
    if (!options.allowCompleted) {
      const listStatus = await db.query(
        "select status from lists where id=$1",
        [listId],
      );
      requireRow(listStatus.rowCount);
      if (listStatus.rows[0].status !== "active")
        throw new DataError(
          "Esta lista ya fue completada y solo está disponible en Historial.",
          410,
        );
    }
    return run(db, listId, email);
  });
}
export function requireRow(count: number | null) {
  if (!count) throw new DataError("El registro no existe en esta lista", 404);
}

export type MemberRole = "owner" | "list_editor" | "list_viewer";
export type ListAccessRole = Exclude<MemberRole, "owner">;
export function canManageList(role: MemberRole): boolean {
  return role === "owner";
}
export function canEditList(role: MemberRole): boolean {
  return role === "owner" || role === "list_editor";
}
export async function listRole(
  db: PoolClient,
   list: string,
  email: string,
): Promise<MemberRole> {
  const result = await db.query(
    "select case when h.owner_email=$2 then 'owner' else m.role end as role from lists h join list_members m on m.list_id=h.id where h.id=$1 and m.email=$2",
    [ list, email],
  );
  if (!result.rowCount)
    throw new DataError(
      "No tienes acceso a esta lista. Inicia sesión con el correo invitado o pide al propietario que te invite.",
      403,
    );
  return result.rows[0].role;
}
export async function withListEditor<T>(
  run: (db: PoolClient,  list: string, email: string) => Promise<T>,
  scope?: string,
  options: { allowCompleted?: boolean } = {},
) {
  return withList(async (db, h, email) => {
    if (!canManageList(await listRole(db, h, email)))
      throw new DataError(
        "Solo el propietario puede gestionar esta lista.",
        403,
      );
    return run(db, h, email);
  }, scope, options);
}

// Item edits require the explicit editor role; viewers remain read-only.
export async function withListItemEditor<T>(
  run: (db: PoolClient,  list: string, email: string) => Promise<T>,
  scope?: string,
) {
  return withList(async (db,  list, email) => {
    if (!canEditList(await listRole(db,  list, email)))
      throw new DataError("Esta lista es de solo lectura para tu acceso", 403);
    return run(db,  list, email);
  }, scope);
}

export type AppRole = "admin" | "user";
export async function appRole(db: PoolClient, email: string): Promise<AppRole> {
  const result = await db.query("select role from app_users where email=$1", [
    email,
  ]);
  return result.rows[0]?.role === "admin" ? "admin" : "user";
}
export async function withCatalog<T>(
  run: (db: PoolClient, email: string) => Promise<T>,
  admin = false,
) {
  const { email } = await identity();
  return transaction(email, async (db) => {
    if (admin && (await appRole(db, email)) !== "admin")
      throw new DataError(
        "Solo el administrador de la app puede modificar el catálogo",
        403,
      );
    await db.query(
      "select pg_advisory_xact_lock(hashtextextended('global_catalog',2))",
    );
    return run(db, email);
  });
}
