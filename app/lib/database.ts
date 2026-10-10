import "server-only";
import { Pool, PoolClient } from "pg";
import { readFileSync } from "node:fs";
import path from "node:path";
import { auth } from "@/auth";

const globalDatabase = globalThis as unknown as { logisticsPool?: Pool };
function pool() {
  if (!globalDatabase.logisticsPool) {
    if (!process.env.SUPABASE_PASSWORD_DB)
      throw new Error("Falta SUPABASE_PASSWORD_DB");
    globalDatabase.logisticsPool = new Pool({
      host:
        process.env.SUPABASE_DB_HOST || "aws-1-us-west-2.pooler.supabase.com",
      port: Number(process.env.SUPABASE_DB_PORT || 6543),
      user: process.env.SUPABASE_DB_USER || "postgres.ntbiypfuelktsjfceqqu",
      password: process.env.SUPABASE_PASSWORD_DB,
      database: "postgres",
      ssl: {
        rejectUnauthorized: true,
        ca: readFileSync(
          path.join(process.cwd(), "supabase/certs/prod-ca-2021.crt"),
          "utf8",
        ),
      },
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });
  }
  return globalDatabase.logisticsPool;
}
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
    await db.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [
      email,
    ]);
    const result = await run(db);
    await db.query("commit");
    return result;
  } catch (error) {
    await db.query("rollback");
    throw error;
  } finally {
    db.release();
  }
}
export async function ensureHousehold(
  db: PoolClient,
  email: string,
): Promise<string> {
  const current = await db.query(
    "select p.household_id from user_preferences p join household_members m on m.household_id=p.household_id and m.email=p.email where p.email=$1",
    [email],
  );
  if (current.rowCount) return current.rows[0].household_id;
  const existing = await db.query(
    "select h.id from households h join household_members m on m.household_id=h.id where m.email=$1 order by (h.owner_email=$1) desc,h.created_at limit 1",
    [email],
  );
  if (existing.rowCount) {
    const id = existing.rows[0].id;
    await db.query(
      "insert into user_preferences(email,household_id) values($1,$2) on conflict(email) do update set household_id=excluded.household_id",
      [email, id],
    );
    return id;
  }
  const home = await db.query(
    "insert into households(owner_email) values($1) returning id",
    [email],
  );
  const id = home.rows[0].id;
  await db.query(
    "insert into household_members(household_id,email) values($1,$2)",
    [id, email],
  );
  await db.query(
    "insert into user_preferences(email,household_id) values($1,$2) on conflict(email) do update set household_id=excluded.household_id",
    [email, id],
  );
  return id;
}
export async function withHousehold<T>(
  run: (db: PoolClient, household: string, email: string) => Promise<T>,
) {
  const { email } = await identity();
  return transaction(email, async (db) => {
    const household = await ensureHousehold(db, email);
    await db.query("select pg_advisory_xact_lock(hashtextextended($1, 1))", [
      household,
    ]);
    // Access may have been revoked while this transaction waited for the household lock.
    if (
      !(
        await db.query(
          "select 1 from household_members where household_id=$1 and email=$2",
          [household, email],
        )
      ).rowCount
    )
      throw new DataError("Ya no tienes acceso a este hogar", 403);
    return run(db, household, email);
  });
}
export function requireRow(count: number | null) {
  if (!count) throw new DataError("El registro no existe en este hogar", 404);
}
