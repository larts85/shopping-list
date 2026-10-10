import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { encode } from "next-auth/jwt";
import pg from "pg";
const origin = process.env.TEST_ORIGIN || "http://localhost:2021";
if (!/^http:\/\/localhost:\d+$/.test(origin))
  throw new Error("Tests require a local server");
const marker = randomUUID();
const email = `migration-test-${marker}@example.invalid`;
const outsider = `outsider-${marker}@example.invalid`;
const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
assert(secret, "Missing auth secret");
async function cookie(email) {
  return `authjs.session-token=${await encode({ secret, salt: "authjs.session-token", token: { email, name: "Migration test" }, maxAge: 600 })}`;
}
const ownCookie = await cookie(email),
  otherCookie = await cookie(outsider);
const pool = new pg.Pool({
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT),
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_PASSWORD_DB,
  database: "postgres",
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync("supabase/certs/prod-ca-2021.crt", "utf8"),
  },
  connectionTimeoutMillis: 10000,
});
let checks = 0;
async function request(
  path,
  method = "GET",
  body,
  session = ownCookie,
  status = 200,
) {
  const r = await fetch(origin + path, {
    method,
    headers: { "Content-Type": "application/json", cookie: session },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const value = await r.json();
  assert.equal(r.status, status, `${method} ${path}: ${JSON.stringify(value)}`);
  checks++;
  return value;
}
async function action(
  name,
  args = [],
  session = ownCookie,
  expectError = false,
) {
  const manifest = JSON.parse(
    readFileSync(".next/dev/server/server-reference-manifest.json", "utf8"),
  );
  const entry = Object.entries(manifest.node).find(
    ([, v]) =>
      v.filename === "app/actions/households.ts" && v.exportedName === name,
  );
  assert(entry, `Missing action ${name}`);
  const response = await fetch(origin + "/logistic/data", {
    method: "POST",
    headers: {
      cookie: session,
      origin,
      "Next-Action": entry[0],
      "Content-Type": "text/plain;charset=UTF-8",
    },
    body: JSON.stringify(args),
  });
  const payload = await response.text();
  const failed = response.status >= 400 || /[a-f0-9]+:E\{/.test(payload);
  assert.equal(failed, expectError, `${name}: unexpected result`);
  checks++;
  if (failed) return;
  const result = payload
    .split("\n")
    .find((line) => /^[a-f0-9]+:\{"a":/.test(line));
  assert(result, `No result for ${name}`);
  const value = JSON.parse(result.slice(result.indexOf(":") + 1)).a;
  if (typeof value === "string" && value.startsWith("$@")) {
    const id = value.slice(2);
    const resolved = payload
      .split("\n")
      .reverse()
      .find(
        (line) =>
          line.startsWith(id + ":") && !/^[DI]/.test(line.slice(id.length + 1)),
      );
    assert(resolved, `Unresolved action ${name}`);
    return JSON.parse(resolved.slice(id.length + 1));
  }
  return value;
}
try {
  await fetch(origin + "/logistic/data", { headers: { cookie: ownCookie } });
  const owner = await action("getHouseholdData");
  const personal = await action("getHouseholdData", [], otherCookie);
  await action("shareHousehold", [outsider]);
  await action("shareHousehold", [outsider]);
  assert.equal((await action("getHouseholdData")).pending.length, 1);
  const recipient = await action("getHouseholdData", [], otherCookie);
  assert.equal(recipient.invitations.length, 1);
  await action(
    "acceptInvitation",
    [recipient.invitations[0].id],
    ownCookie,
    true,
  );
  await action("acceptInvitation", [recipient.invitations[0].id], otherCookie);
  const accepted = await action("getHouseholdData", [], otherCookie);
  assert.equal(accepted.household.id, owner.household.id);
  assert.equal(accepted.households.length, 2);
  await request("/api/categories/add-category", "POST", "QA hogar compartido");
  assert.equal(
    (
      await request(
        "/api/categories/get-categories",
        "GET",
        undefined,
        otherCookie,
      )
    )[0].name,
    "QA hogar compartido",
  );
  await action("shareHousehold", [email], otherCookie, true);
  await action("revokeAccess", [email], otherCookie, true);
  await action("switchHousehold", [personal.household.id], ownCookie, true);
  await action("switchHousehold", [personal.household.id], otherCookie);
  assert.deepEqual(
    await request(
      "/api/categories/get-categories",
      "GET",
      undefined,
      otherCookie,
    ),
    [],
  );
  await action("switchHousehold", [owner.household.id], otherCookie);
  await action("revokeAccess", [outsider]);
  assert.equal(
    (await action("getHouseholdData", [], otherCookie)).household.id,
    personal.household.id,
    "Revocation must return to personal household",
  );
  await action("switchHousehold", [owner.household.id], otherCookie, true);
  await action("revokeAccess", [email], ownCookie, true);
  await action("shareHousehold", [outsider]);
  await action("revokeAccess", [outsider]);
  assert.equal(
    (await action("getHouseholdData", [], otherCookie)).invitations.length,
    0,
  );
  // Reproduce revocation while a recipient operation waits for the household lock.
  await action("shareHousehold", [outsider]);
  const raceInvite = (await action("getHouseholdData", [], otherCookie))
    .invitations[0];
  await action("acceptInvitation", [raceInvite.id], otherCookie);
  const blocker = await pool.connect();
  let pending;
  try {
    await blocker.query("begin");
    const pid = (await blocker.query("select pg_backend_pid() as pid")).rows[0]
      .pid;
    await blocker.query(
      "select pg_advisory_xact_lock(hashtextextended($1, 1))",
      [owner.household.id],
    );
    pending = request(
      "/api/categories/get-categories",
      "GET",
      undefined,
      otherCookie,
      403,
    );
    let waiting = false;
    for (let attempt = 0; attempt < 50 && !waiting; attempt++) {
      waiting = Boolean(
        (
          await blocker.query(
            "select 1 from pg_locks holder join pg_locks waiter on waiter.locktype=holder.locktype and waiter.database=holder.database and waiter.classid=holder.classid and waiter.objid=holder.objid and waiter.objsubid=holder.objsubid where holder.pid=$1 and holder.locktype='advisory' and holder.granted and not waiter.granted",
            [pid],
          )
        ).rowCount,
      );
      if (!waiting) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert(waiting, "Recipient must be waiting for household lock");
    await blocker.query(
      "delete from user_preferences where household_id=$1 and email=$2",
      [owner.household.id, outsider],
    );
    await blocker.query(
      "delete from household_members where household_id=$1 and email=$2",
      [owner.household.id, outsider],
    );
    await blocker.query("commit");
    await pending;
    assert.equal(
      (await action("getHouseholdData", [], otherCookie)).household.id,
      personal.household.id,
    );
  } finally {
    await blocker.query("rollback");
    blocker.release();
    if (pending) await pending.catch(() => {});
  }
  console.info(`PASS: ${checks} household sharing checks`);
} finally {
  await pool.query("delete from user_preferences where email=any($1::text[])", [
    [email, outsider],
  ]);
  await pool.query("delete from households where owner_email=any($1::text[])", [
    [email, outsider],
  ]);
  await pool.end();
}
