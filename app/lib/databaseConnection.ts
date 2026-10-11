import "server-only";
import { Pool } from "pg";
import { readFileSync } from "node:fs";
import path from "node:path";
const globalDatabase = globalThis as unknown as { logisticsPool?: Pool };
export function pool() {
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
      ssl:
        process.env.SUPABASE_DB_HOST === "127.0.0.1"
          ? false
          : {
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
