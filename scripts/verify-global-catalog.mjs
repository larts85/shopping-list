// A disposable local Postgres instance. No cloud credentials or remote writes.
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { encode } from "next-auth/jwt";
import { readFileSync, readdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
const db = await PGlite.create();
let next;
let server;
let output = "";
let checks = 0;
const admin = "larts85@gmail.com",
  user = "masajelasmanos@example.invalid",
  outsider = "new-user@example.invalid";
const homeA = randomUUID(),
  homeB = randomUUID();
const origin = "http://localhost:2037";
const secret = "local-qa-only-secret-never-used-in-cloud";
const cookie = async (email) =>
  `authjs.session-token=${await encode({ secret, salt: "authjs.session-token", token: { email, name: "QA" }, maxAge: 600 })}`;
async function req(
  path,
  method = "GET",
  body,
  email = user,
  status = 200,
  scope,
) {
  const response = await fetch(origin + path, {
    method,
    headers: {
      cookie: email ? await cookie(email) : "",
      "content-type": "application/json",
      ...(scope ? { "X-List-ID": scope } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  assert.equal(response.status, status, `${path}: ${JSON.stringify(result)}`);
  checks++;
  return result;
}
try {
  await db.exec(
    "create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create schema preview_lists;",
  );
  const migrationNames = readdirSync("supabase/migrations")
    .filter((n) => n.endsWith(".sql"))
    .sort();
  for (const name of migrationNames) {
    if (name.includes("global_catalog")) break;
    await db.exec(
      "begin;" +
        readFileSync("supabase/migrations/" + name, "utf8").replaceAll(
          "public.",
          "preview_lists.",
        ) +
        "commit;",
    );
  }
  await db.query(
    "insert into preview_lists.households(id,owner_email,name) values($1,$2,$3),($4,$5,$6)",
    [homeA, admin, "Admin lista", homeB, user, "Masaje lista"],
  );
  await db.query(
    "insert into preview_lists.household_members(household_id,email) values($1,$2),($3,$4)",
    [homeA, admin, homeB, user],
  );
  await db.query(
    "insert into preview_lists.categories(id,household_id,name) values($1,$2,$3),($4,$5,$6)",
    ["old-category", homeA, "Alimentos", "user-category", homeB, "Higiene"],
  );
  await db.query(
    "insert into preview_lists.products(id,household_id,name,id_category,unit,checked) values($1,$2,$3,$4,$5,$6)",
    ["old-product", homeA, "Queso", "old-category", "kg", true],
  );
  await db.query(
    "insert into preview_lists.shopping_list(id,household_id,id_product,cantidad,medida,precio,comprado,unit) values($1,$2,$3,1,1,10,true,$4)",
    ["old-purchase", homeA, "old-product", "kg"],
  );
  await db.query(
    "insert into preview_lists.historical(household_id,purchase) values($1,$2)",
    [homeB, { name: "Compra anterior", cantidad: 1 }],
  );
  const globalMigration = migrationNames.find((n) =>
    n.includes("global_catalog"),
  );
  await db.exec(
    "begin;" +
      readFileSync("supabase/migrations/" + globalMigration, "utf8").replaceAll(
        "public.",
        "preview_lists.",
      ) +
      "commit;",
  );
  assert.equal(
    (await db.query("select count(*)::int n from preview_lists.shopping_list"))
      .rows[0].n,
    1,
  );
  checks++;
  assert.equal(
    (await db.query("select purchase from preview_lists.historical")).rows[0]
      .purchase.name,
    "Compra anterior",
  );
  checks++;
  server = new PGLiteSocketServer({
    db,
    host: "127.0.0.1",
    port: 55437,
    maxConnections: 20,
  });
  await server.start();
  next = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "-p", "2037", "--webpack"],
    {
      env: {
        ...process.env,
        AUTH_SECRET: secret,
        NEXTAUTH_SECRET: secret,
        AUTH_TRUST_HOST: "true",
        SUPABASE_DB_HOST: "127.0.0.1",
        SUPABASE_DB_PORT: "55437",
        SUPABASE_DB_USER: "postgres",
        SUPABASE_PASSWORD_DB: "local-test",
        SUPABASE_DB_SCHEMA: "preview_lists",
        GMAIL_USER_EMAIL: "",
        GMAIL_APP_PASSWORD: "",
        RESEND_API_KEY: "",
        INVITATION_FROM: "",
        SUPABASE_AUTH_URL: "https://local-test.supabase.co",
        SUPABASE_AUTH_PUBLISHABLE_KEY: "local-test-key",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  next.stdout.on("data", (b) => {
    output += b;
  });
  next.stderr.on("data", (b) => {
    output += b;
  });
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(origin + "/api/auth/session");
      if (r.status === 200) break;
    } catch {}
    if (next.exitCode !== null) throw new Error(output);
    await new Promise((r) => setTimeout(r, 500));
  }
  await req("/api/profile", "GET", undefined, "", 401);
  assert.equal((await req("/api/profile")).role, "user");
  checks++;
  assert.equal(
    (await req("/api/profile", "GET", undefined, admin)).role,
    "admin",
  );
  checks++;
  const cats = await req("/api/categories/get-categories");
  assert.deepEqual(
    cats,
    await req("/api/categories/get-categories", "GET", undefined, outsider),
  );
  checks++;
  assert.ok(cats.some((c) => c.name === "Higiene"));
  assert.ok(cats.some((c) => c.name === "Alimentos"));
  checks += 2;
  const products = await req("/api/products/get-products");
  assert.ok(products.some((p) => p.id === "old-product"));
  checks++;
  const denied = [
    ["/api/categories/add-category", "POST", "No autorizado"],
    [
      "/api/categories/edit-category",
      "PUT",
      { idCategory: "old-category", newNameCategory: "No autorizado" },
    ],
    ["/api/categories/delete-category", "DELETE", "old-category"],
    [
      "/api/products/add-product",
      "POST",
      { name: "No autorizado", idCategory: "old-category", unit: "un" },
    ],
    [
      "/api/products/edit-name-product",
      "PUT",
      { idProduct: "old-product", newNameProduct: "No autorizado" },
    ],
    ["/api/products/delete-product-by-id", "DELETE", "old-product"],
  ];
  for (const [path, method, body] of denied)
    await req(path, method, body, user, 403);
  const own = await req("/api/households");
  assert.equal(own.role, "user");
  assert.equal(own.canEditList, true);
  checks += 2;
  await req(
    "/api/households",
    "POST",
    { action: "role", email: outsider, role: "admin" },
    user,
    403,
  );
  await req("/api/products/edit-checked-product", "PUT", {
    idProduct: "old-product",
    checked: true,
  });
  await req("/api/list/add-list", "POST");
  let list = await req("/api/list/get-list");
  assert.equal(list.length, 1);
  checks++;
  for (const invalid of [-1, 0, "", null, "no-number"])
    await req(
      "/api/list/update-multiple-products",
      "PUT",
      [{ id: list[0].id, cantidad: invalid, medida: 1, precio: 0, unit: "kg" }],
      user,
      400,
    );
  await req(
    "/api/list/update-multiple-products",
    "PUT",
    [{ id: list[0].id, cantidad: 1, medida: 1, precio: 0, unit: "lt" }],
    user,
    400,
  );
  await req("/api/list/update-multiple-products", "PUT", [
    { id: list[0].id, cantidad: 0.5, medida: 1, precio: 0, unit: "kg" },
  ]);
  const second = (
    await req("/api/households", "POST", {
      action: "create",
      name: "Otra lista",
    })
  ).result;
  assert.equal((await req("/api/list/get-list")).length, 0);
  checks++;
  assert.equal(
    (await req("/api/products/get-products")).length,
    products.length,
  );
  checks++;
  assert.equal(
    (
      await req(
        "/api/list/get-list",
        "GET",
        undefined,
        user,
        200,
        own.household.id,
      )
    ).length,
    1,
  );
  checks++;
  await req(
    "/api/list/get-list",
    "GET",
    undefined,
    outsider,
    403,
    own.household.id,
  );
  await req("/api/list/get-list", "GET", undefined, user, 400, "not-a-uuid");
  await req("/api/catalog-requests", "POST", {
    kind: "category",
    name: "Ferretería",
    note: "Solicitud de usuario",
  });
  let requests = await req("/api/catalog-requests");
  const categoryRequest = requests[0];
  assert.equal(categoryRequest.status, "pending");
  checks++;
  assert.ok(
    !(await req("/api/categories/get-categories")).some(
      (c) => c.name === "Ferretería",
    ),
  );
  checks++;
  assert.ok(
    (await req("/api/catalog-requests", "GET", undefined, admin)).some(
      (r) => r.id === categoryRequest.id,
    ),
  );
  checks++;
  assert.equal(
    (await req("/api/catalog-requests", "GET", undefined, outsider)).length,
    0,
  );
  checks++;
  await req(
    "/api/catalog-requests",
    "PUT",
    { id: categoryRequest.id, decision: "approve" },
    user,
    403,
  );
  await req(
    "/api/catalog-requests",
    "PUT",
    { id: categoryRequest.id, decision: "approve" },
    admin,
  );
  const category = (
    await req("/api/categories/get-categories", "GET", undefined, outsider)
  ).find((c) => c.name === "Ferretería");
  assert.ok(category);
  checks++;
  await req(
    "/api/catalog-requests",
    "PUT",
    { id: categoryRequest.id, decision: "approve" },
    admin,
    409,
  );
  await req("/api/catalog-requests", "POST", {
    kind: "product",
    name: "Tornillos",
    categoryId: category.id,
    unit: "un",
  });
  const productRequest = (await req("/api/catalog-requests"))[0];
  await req(
    "/api/catalog-requests",
    "PUT",
    { id: productRequest.id, decision: "approve" },
    admin,
  );
  const newProduct = (
    await req("/api/products/get-products", "GET", undefined, outsider)
  ).find((p) => p.name === "Tornillos");
  assert.ok(newProduct);
  checks++;
  await req("/api/catalog-requests", "POST", {
    kind: "product",
    name: "Rechazar",
    categoryId: category.id,
    unit: "un",
  });
  const reject = (await req("/api/catalog-requests"))[0];
  await req(
    "/api/catalog-requests",
    "PUT",
    { id: reject.id, decision: "reject" },
    admin,
  );
  assert.ok(
    !(await req("/api/products/get-products")).some(
      (p) => p.name === "Rechazar",
    ),
  );
  checks++;
  await req(
    "/api/catalog-requests",
    "POST",
    { kind: "product", name: "Bad unit", categoryId: category.id, unit: "bad" },
    user,
    400,
  );
  await req(
    "/api/catalog-requests",
    "POST",
    {
      kind: "product",
      name: "Bad category",
      categoryId: "missing",
      unit: "un",
    },
    user,
    404,
  );
  await req(
    "/api/households",
    "POST",
    { action: "share", email: outsider },
    user,
    200,
    second,
  );
  const recipient = await req("/api/households", "GET", undefined, outsider);
  assert.equal(recipient.invitations.length, 1);
  checks++;
  await req(
    "/api/households",
    "POST",
    { action: "accept", id: recipient.invitations[0].id },
    admin,
    404,
  );
  await req(
    "/api/households",
    "POST",
    { action: "accept", id: recipient.invitations[0].id },
    outsider,
  );
  const shared = await req("/api/households", "GET", undefined, outsider);
  assert.equal(shared.role, "user");
  assert.equal(shared.canEditList, false);
  checks += 2;
  await req(
    "/api/products/edit-checked-product",
    "PUT",
    { idProduct: newProduct.id, checked: true },
    outsider,
    403,
    second,
  );
  await req(
    "/api/suggestions",
    "POST",
    { kind: "add", productId: newProduct.id, quantity: 2, unit: "un" },
    outsider,
    200,
    second,
  );
  const suggestion = (
    await req("/api/suggestions", "GET", undefined, user, 200, second)
  )[0];
  await req(
    "/api/suggestions",
    "PUT",
    { id: suggestion.id, decision: "approve" },
    user,
    200,
    second,
  );
  assert.equal(
    (await req("/api/list/get-list", "GET", undefined, user, 200, second))
      .length,
    1,
  );
  checks++;
  await req(
    "/api/households",
    "POST",
    { action: "revoke", email: outsider },
    user,
    200,
    second,
  );
  await req("/api/list/get-list", "GET", undefined, outsider, 403, second);
  await req(
    "/api/list/set-bought",
    "PUT",
    { idList: list[0].id, cantidad: 0.5, medida: 1, precio: 1000, unit: "kg" },
    user,
    200,
    own.household.id,
  );
  await req(
    "/api/historical/add-historical",
    "POST",
    undefined,
    user,
    200,
    own.household.id,
  );
  const history = await req(
    "/api/historical/get-historical",
    "GET",
    undefined,
    user,
    200,
    own.household.id,
  );
  assert.ok(history.items.some((i) => i.purchase.name === "Queso"));
  checks++;
  assert.equal(
    (
      await req(
        "/api/list/get-list",
        "GET",
        undefined,
        user,
        200,
        own.household.id,
      )
    ).length,
    0,
  );
  checks++;
  await req(
    "/api/products/delete-product-by-id",
    "DELETE",
    "old-product",
    admin,
  );
  assert.ok(
    !(await req("/api/products/get-products")).some(
      (p) => p.id === "old-product",
    ),
  );
  checks++;
  assert.equal(
    (
      await req(
        "/api/historical/get-historical",
        "GET",
        undefined,
        user,
        200,
        own.household.id,
      )
    ).items.length,
    history.items.length,
  );
  checks++;
  await assert.rejects(() =>
    db.exec(
      "insert into preview_lists.app_users(email,role) values('attacker@example.invalid','admin')",
    ),
  );
  checks++;
  console.log(
    `${checks} local PostgreSQL/HTTP checks passed: global catalog, user/admin, requests, list isolation, sharing, units, history, legacy migration.`,
  );
} catch (error) {
  console.error(error);
  console.error(output.slice(-5000));
  process.exitCode = 1;
} finally {
  if (next) {
    next.kill("SIGTERM");
    await new Promise((r) => {
      next.once("exit", r);
      setTimeout(r, 5000).unref();
    });
  }
  if (server) await server.stop();
  await db.close();
}
