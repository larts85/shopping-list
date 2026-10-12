import "server-only";
import { pool } from "./databaseConnection";
import { databaseSchema } from "./databaseSchema";
import { verifySupabaseGoogleIdentity } from "./googleSupabaseIdentity";

export async function syncGoogleUser(
  idToken: string,
  email: string,
  name?: string | null,
) {
  const identity = await verifySupabaseGoogleIdentity(idToken, email);
  const db = await pool().connect();
  try {
    await db.query("begin");
    await db.query("select set_config('search_path',$1,true)", [
      databaseSchema(),
    ]);
    await db.query(
      "insert into app_users(email,auth_user_id,name,role) values($1,$2,$3,case when $1='larts85@gmail.com' then 'admin' else 'user' end) on conflict(email) do update set auth_user_id=excluded.auth_user_id,name=excluded.name",
      [identity.email, identity.id, name ?? null],
    );
    await db.query("commit");
    return identity;
  } catch (error) {
    await db.query("rollback");
    throw error;
  } finally {
    db.release();
  }
}
