import assert from "node:assert/strict";
import { verifySupabaseGoogleIdentity } from "../app/lib/googleSupabaseIdentity.ts";
const env = {
  SUPABASE_AUTH_URL: "https://project.supabase.co",
  SUPABASE_AUTH_PUBLISHABLE_KEY: "test-publishable",
};
const user = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "USER@example.invalid",
  email_confirmed_at: "2026-10-11",
  identities: [{ provider: "google" }],
};
assert.deepEqual(
  await verifySupabaseGoogleIdentity(
    "verified-id-token",
    "user@example.invalid",
    env,
    async () => user,
  ),
  { id: user.id, email: "user@example.invalid" },
);
for (const invalid of [
  { ...user, email: "attacker@example.invalid" },
  { ...user, email_confirmed_at: undefined },
  { ...user, identities: [{ provider: "email" }] },
  { ...user, id: "" },
])
  await assert.rejects(() =>
    verifySupabaseGoogleIdentity(
      "token",
      "user@example.invalid",
      env,
      async () => invalid,
    ),
  );
await assert.rejects(() =>
  verifySupabaseGoogleIdentity(
    "token",
    "user@example.invalid",
    {},
    async () => user,
  ),
);
await assert.rejects(() =>
  verifySupabaseGoogleIdentity(
    "",
    "user@example.invalid",
    env,
    async () => user,
  ),
);
await assert.rejects(() =>
  verifySupabaseGoogleIdentity(
    "token",
    "user@example.invalid",
    { ...env, SUPABASE_AUTH_URL: "http://project.supabase.co" },
    async () => user,
  ),
);
await assert.rejects(() =>
  verifySupabaseGoogleIdentity(
    "token",
    "user@example.invalid",
    env,
    async () => {
      throw new Error("Provider rejected token");
    },
  ),
);
console.log("9 Google/Supabase identity checks passed");
