import assert from "node:assert/strict";
import { databaseSchema } from "../app/lib/databaseSchema.ts";
assert.equal(databaseSchema({}), "public");
assert.equal(
  databaseSchema({ SUPABASE_DB_SCHEMA: "public", VERCEL_ENV: "production" }),
  "public",
);
assert.equal(
  databaseSchema({ SUPABASE_DB_SCHEMA: "preview_lists" }),
  "preview_lists",
);
assert.equal(
  databaseSchema({
    SUPABASE_DB_SCHEMA: "preview_lists",
    VERCEL_ENV: "preview",
  }),
  "preview_lists",
);
for (const schema of [
  "",
  "public,preview_lists",
  "preview_lists; drop schema public",
  "pg_catalog",
  "unknown",
])
  assert.throws(() => databaseSchema({ SUPABASE_DB_SCHEMA: schema }));
assert.throws(() => databaseSchema({ VERCEL_ENV: "preview" }));
assert.throws(() =>
  databaseSchema({ VERCEL_ENV: "preview", SUPABASE_DB_SCHEMA: "public" }),
);
console.log("11 fail-closed database-schema checks passed");
