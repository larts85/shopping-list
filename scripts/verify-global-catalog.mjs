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
const testPort = process.env.TEST_PORT || process.env.QA_HTTP_PORT || "2037";
const databasePort = Number(
  process.env.TEST_DB_PORT || process.env.QA_DATABASE_PORT || 55437,
);
const origin = `http://localhost:${testPort}`;
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
  const slugMigration = migrationNames.find((n) => n.includes("list_slugs"));
  await db.exec(
    readFileSync("supabase/migrations/" + slugMigration, "utf8").replaceAll(
      "public.",
      "preview_lists.",
    ),
  );
  const nameMigration = migrationNames.find((n) =>
    n.includes("list_name_suggestions"),
  );
  await db.exec(
    readFileSync("supabase/migrations/" + nameMigration, "utf8").replaceAll(
      "public.",
      "preview_lists.",
    ),
  );
  const availableUnitsMigration = migrationNames.find((n) =>
    n.includes("product_available_units"),
  );
  await db.exec(
    readFileSync("supabase/migrations/" + availableUnitsMigration, "utf8").replaceAll(
      "public.",
      "preview_lists.",
    ),
  );
  const provisionalItemsMigration = migrationNames.find((n) =>
    n.includes("provisional_list_items"),
  );
  await db.exec(
    readFileSync("supabase/migrations/" + provisionalItemsMigration, "utf8").replaceAll(
      "public.",
      "preview_lists.",
    ),
  );
  for (const migrationName of [
    "20261013190000_add_milligram_unit.sql",
    "20261014021329_comprimidos_unit_for_pharmacy.sql",
  ]) {
    assert.ok(
      migrationNames.includes(migrationName),
      `${migrationName} must exist`,
    );
    await db.exec(
      readFileSync("supabase/migrations/" + migrationName, "utf8").replaceAll(
        "public.",
        "preview_lists.",
      ),
    );
  }
  const purchaseDetailsMigration = migrationNames.find((n) =>
    n.includes("purchase_details_and_optional_price"),
  );
  assert.ok(purchaseDetailsMigration);
  await db.exec(
    readFileSync("supabase/migrations/" + purchaseDetailsMigration, "utf8").replaceAll(
      "public.",
      "preview_lists.",
    ),
  );
  const exactPurchaseTotalMigration = migrationNames.find((n) =>
    n.includes("preserve_exact_purchase_total"),
  );
  assert.ok(exactPurchaseTotalMigration);
  await db.exec(
    readFileSync("supabase/migrations/" + exactPurchaseTotalMigration, "utf8").replaceAll(
      "public.",
      "preview_lists.",
    ),
  );
  checks++;
  const protection = (
    await db.query(
      "select relrowsecurity as rls, has_table_privilege('anon','preview_lists.list_name_suggestions','select') as anon_read, has_table_privilege('authenticated','preview_lists.list_name_suggestions','insert') as authenticated_write from pg_class where oid='preview_lists.list_name_suggestions'::regclass",
    )
  ).rows[0];
  assert.deepEqual(protection, {
    rls: true,
    anon_read: false,
    authenticated_write: false,
  });
  checks++;
  const slugs = (await db.query("select id,slug from preview_lists.households"))
    .rows;
  assert.equal(new Set(slugs.map((h) => h.slug)).size, 2);
  assert.ok(slugs.every((h) => /^lista-[0-9a-f]{32}$/.test(h.slug)));
  await assert.rejects(
    db.query("update preview_lists.households set slug=$1 where id=$2", [
      slugs[0].slug,
      slugs[1].id,
    ]),
    /unique/,
  );
  const linkedSlug = slugs.find((h) => h.id === homeB).slug;
  checks += 3;
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
    port: databasePort,
    maxConnections: 20,
  });
  await server.start();
  next = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "-p", testPort, "--webpack"],
    {
      env: {
        ...process.env,
        AUTH_SECRET: secret,
        NEXTAUTH_SECRET: secret,
        AUTH_TRUST_HOST: "true",
        SUPABASE_DB_HOST: "127.0.0.1",
        SUPABASE_DB_PORT: String(databasePort),
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
    if (next.exitCode !== null) throw new Error(output);
    if (!output.includes("Ready in")) {
      await new Promise((r) => setTimeout(r, 500));
      continue;
    }
    try {
      const r = await fetch(origin + "/api/auth/session");
      if (r.status === 200) break;
    } catch {}
    if (next.exitCode !== null) throw new Error(output);
    await new Promise((r) => setTimeout(r, 500));
  }
  // Verify both purchase price modes against a disposable local PGlite fixture.
  await db.query(
    "insert into preview_lists.app_users(email,role) values($1,'admin') on conflict(email) do nothing",
    [admin],
  );
  // Reproduce the user's bulk-add payload against the complete disposable schema.
  const bulkCategoryIds = [
    "60aa47c7-129d-4df4-b197-0709e4c4ebb2",
    "29fb56be-9854-4d68-898d-558b0532dbd6",
  ];
  await db.query(
    "insert into preview_lists.catalog_categories(id,name) values($1,'Almacén fixture'),($2,'Limpieza fixture')",
    bulkCategoryIds,
  );
  const bulkPayload = [
    {
      name: "Aceitunas",
      idCategory: bulkCategoryIds[0],
      cantidad: 1,
      unit: "un",
      availableUnits: ["un"],
    },
    {
      name: "Ajo en polvo",
      idCategory: bulkCategoryIds[0],
      cantidad: 1,
      unit: "kg",
      availableUnits: ["kg", "g", "mg"],
    },
    {
      name: "Condimento para arroz",
      idCategory: bulkCategoryIds[0],
      cantidad: 1,
      unit: "un",
      availableUnits: ["un"],
    },
    {
      name: "Orégano",
      idCategory: bulkCategoryIds[0],
      cantidad: 1,
      unit: "un",
      availableUnits: ["un"],
    },
    {
      name: "Pimentón ahumado",
      idCategory: bulkCategoryIds[0],
      cantidad: 1,
      unit: "un",
      availableUnits: ["un"],
    },
    {
      name: "Pochoclos",
      idCategory: bulkCategoryIds[0],
      cantidad: 1,
      unit: "un",
      availableUnits: ["un"],
    },
    {
      name: "Detergente magistral",
      idCategory: bulkCategoryIds[1],
      cantidad: 1,
      unit: "lt",
      availableUnits: ["lt", "ml"],
    },
    {
      name: "Esponja",
      idCategory: bulkCategoryIds[1],
      cantidad: 1,
      unit: "un",
      availableUnits: ["un"],
    },
    {
      name: "Virulana",
      idCategory: bulkCategoryIds[1],
      cantidad: 1,
      unit: "un",
      availableUnits: ["un"],
    },
  ];
  assert.deepEqual(
    await req("/api/list/bulk-add", "POST", bulkPayload, admin, 200, homeA),
    { added: 9, catalogRequests: 9 },
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from preview_lists.shopping_list where household_id=$1 and provisional_name = any($2::text[])",
        [homeA, bulkPayload.map((item) => item.name)],
      )
    ).rows[0].n,
    9,
  );
  checks += 2;
  const unitPriceItemId = randomUUID();
  const totalPriceItemId = randomUUID();
  await db.query(
    `insert into preview_lists.shopping_list(
       id,household_id,id_product,cantidad,medida,precio,comprado,unit,
       provisional_name,provisional_category_id,provisional_created_by,
       provisional_available_units
     ) values
       ($1,$3,null,1,1,0,false,'un','Precio unitario regresión','old-category',$4,array['un']),
       ($2,$3,null,1,1,0,false,'un','Precio total regresión','old-category',$4,array['un'])`,
    [unitPriceItemId, totalPriceItemId, homeA, admin],
  );
  await req(
    "/api/list/set-bought",
    "PUT",
    {
      idList: unitPriceItemId,
      cantidad: 3,
      medida: 1,
      precio: 12.34,
      precioMode: "unit",
      unit: "un",
    },
    admin,
    200,
    homeA,
  );
  await req(
    "/api/list/set-bought",
    "PUT",
    {
      idList: totalPriceItemId,
      cantidad: 3,
      medida: 1,
      precio: 29.99,
      precioMode: "total",
      unit: "un",
    },
    admin,
    200,
    homeA,
  );
  const currency = (amount) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  const pricedList = await req(
    "/api/list/get-list",
    "GET",
    undefined,
    admin,
    200,
    homeA,
  );
  const unitPriced = pricedList.find((item) => item.id === unitPriceItemId);
  const totalPriced = pricedList.find((item) => item.id === totalPriceItemId);
  assert.equal(unitPriced.precioTotal, currency(37.02));
  assert.equal(totalPriced.precioTotal, currency(29.99));
  assert.ok(Math.abs(Number(totalPriced.precioValue) * 3 - 29.99) < 1e-9);
  checks += 3;
  await req(
    "/api/list/item-details",
    "PATCH",
    {
      id: totalPriceItemId,
      description: "",
      cantidad: 3,
      unit: "un",
      precio: Number(totalPriced.precioValue),
    },
    admin,
    200,
    homeA,
  );
  const detailsRefresh = await req(
    "/api/list/get-list",
    "GET",
    undefined,
    admin,
    200,
    homeA,
  );
  assert.equal(
    detailsRefresh.find((item) => item.id === totalPriceItemId).precioTotal,
    currency(29.99),
  );
  checks++;
  const pricePurchase = await req(
    "/api/historical/add-historical",
    "POST",
    { productIds: [unitPriceItemId, totalPriceItemId] },
    admin,
    200,
    homeA,
  );
  const priceHistory = await req(
    "/api/historical/get-historical",
    "GET",
    undefined,
    admin,
    200,
    homeA,
  );
  const unitSnapshot = priceHistory.items.find(
    (item) => item.purchase.id_list === unitPriceItemId,
  );
  const totalSnapshot = priceHistory.items.find(
    (item) => item.purchase.id_list === totalPriceItemId,
  );
  assert.equal(unitSnapshot.purchase.purchase_id, pricePurchase.purchaseId);
  assert.equal(Number(unitSnapshot.purchase.precio_total), 37.02);
  assert.equal(totalSnapshot.purchase.purchase_id, pricePurchase.purchaseId);
  assert.equal(Number(totalSnapshot.purchase.precio_total), 29.99);
  assert.ok(
    Math.abs(Number(totalSnapshot.purchase.precio) * 3 - 29.99) < 1e-9,
  );
  checks += 5;
  await db.query(
    "delete from preview_lists.historical where purchase->>'purchase_id'=$1",
    [pricePurchase.purchaseId],
  );
  // Cart mutations must stay scoped and leave the global catalog untouched.
  const original = (
    await db.query(
      "select id,id_product from preview_lists.shopping_list where household_id=$1",
      [homeA],
    )
  ).rows[0];
  await req(
    "/api/list/cart-items",
    "PATCH",
    { id: original.id },
    "",
    401,
    homeA,
  );
  await req(
    "/api/list/cart-items",
    "PATCH",
    { id: original.id },
    user,
    403,
    homeA,
  );
  await req(
    "/api/list/cart-items",
    "PATCH",
    { id: original.id },
    admin,
    200,
    homeA,
  );
  assert.equal(
    (
      await db.query(
        "select comprado from preview_lists.shopping_list where id=$1",
        [original.id],
      )
    ).rows[0].comprado,
    false,
  );
  await req(
    "/api/list/cart-items",
    "PATCH",
    { id: original.id },
    user,
    404,
    homeB,
  );
  await db.query(
    "update preview_lists.shopping_list set comprado=true where id=$1",
    [original.id],
  );
  await req("/api/list/cart-items", "DELETE", {}, admin, 400, homeA);
  await req(
    "/api/list/cart-items",
    "DELETE",
    { productId: original.id },
    user,
    403,
    homeA,
  );
  const cartCategory = (
    await db.query(
      "select id_category from preview_lists.catalog_products where id=$1",
      [original.id_product],
    )
  ).rows[0].id_category;
  await db.query(
    "insert into preview_lists.shopping_list(id,household_id,id_product) values('cart-other-scope',$1,$2)",
    [homeB, original.id_product],
  );
  // An accepted member can remove/unmark items but cannot finalize purchases.
  await db.query(
    "insert into preview_lists.household_members(household_id,email) values($1,$2)",
    [homeB, outsider],
  );
  await db.query(
    "insert into preview_lists.list_selections(household_id,product_id,checked) values($1,$2,true) on conflict(household_id,product_id) do update set checked=true",
    [homeB, original.id_product],
  );
  await db.query(
    "update preview_lists.shopping_list set comprado=true,cantidad=1,medida=1,precio=10,unit='kg' where id='cart-other-scope'",
  );
  await req(
    "/api/historical/add-historical",
    "POST",
    { productIds: ["cart-other-scope"] },
    outsider,
    403,
    homeB,
  );
  await req(
    "/api/list/cart-items",
    "PATCH",
    { id: "cart-other-scope" },
    outsider,
    200,
    homeB,
  );
  assert.equal(
    (
      await db.query(
        "select comprado from preview_lists.shopping_list where id='cart-other-scope'",
      )
    ).rows[0].comprado,
    false,
  );
  checks++;
  await req(
    "/api/list/cart-items",
    "DELETE",
    { categoryId: cartCategory },
    outsider,
    200,
    homeB,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from preview_lists.list_selections where household_id=$1 and product_id=$2",
        [homeB, original.id_product],
      )
    ).rows[0].n,
    0,
  );
  checks++;
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from preview_lists.shopping_list where household_id=$1",
        [homeB],
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from preview_lists.shopping_list where id=$1",
        [original.id],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from preview_lists.catalog_products where id=$1",
        [original.id_product],
      )
    ).rows[0].n,
    1,
  );
  await db.query(
    "insert into preview_lists.shopping_list(id,household_id,id_product) values('cart-other-scope',$1,$2)",
    [homeB, original.id_product],
  );
  await req(
    "/api/list/cart-items",
    "DELETE",
    { productId: "cart-other-scope" },
    outsider,
    200,
    homeB,
  );
  await db.query(
    "delete from preview_lists.household_members where household_id=$1 and email=$2",
    [homeB, outsider],
  );
  await req(
    "/api/list/cart-items",
    "PATCH",
    { id: "cart-other-scope" },
    outsider,
    403,
    homeB,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from preview_lists.catalog_categories where id=$1",
        [cartCategory],
      )
    ).rows[0].n,
    1,
  );
  checks += 5;
  const legacy = await fetch(
    origin + "/logistic/lists/" + linkedSlug + "?qa=1",
    { redirect: "manual" },
  );
  assert.equal(legacy.status, 308);
  assert.equal(
    new URL(legacy.headers.get("location"), origin).pathname,
    "/lists/" + linkedSlug,
  );
  assert.equal(new URL(legacy.headers.get("location"), origin).search, "?qa=1");
  checks += 3;
  await req("/api/households?view=home", "GET", undefined, "", 401);
  const emptyHome = await req(
    "/api/households?view=home",
    "GET",
    undefined,
    outsider,
  );
  assert.deepEqual(emptyHome.lists, []);
  assert.deepEqual(emptyHome.invitations, []);
  await req("/api/households?view=home", "GET", undefined, outsider);
  await req("/api/households", "GET", undefined, outsider, 409);
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from preview_lists.households where owner_email=$1",
        [outsider],
      )
    ).rows[0].n,
    0,
  );
  checks += 3;
  await req(
    "/api/households",
    "POST",
    { action: "create", name: " " },
    outsider,
    400,
  );
  await req(
    "/api/households",
    "POST",
    { action: "create", name: "x".repeat(201) },
    outsider,
    400,
  );
  const recipientCreated = await req(
    "/api/households",
    "POST",
    { action: "create" },
    outsider,
  );
  const recipientHome = await req(
    "/api/households?view=home",
    "GET",
    undefined,
    outsider,
  );
  assert.equal(recipientHome.lists.length, 1);
  assert.equal(recipientHome.lists[0].slug, recipientCreated.slug);
  assert.equal(
    recipientHome.lists[0].name,
    `Compras ${new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date())}`,
  );
  checks += 3;
  const linkedPath = `/api/households?slug=${linkedSlug}`;
  assert.deepEqual(await req(linkedPath), { kind: "member", id: homeB });
  await req(linkedPath, "GET", undefined, outsider, 403);
  await req(linkedPath, "GET", undefined, "", 401);
  await req("/api/households?slug=invalid", "GET", undefined, user, 400);
  const redirect = await fetch(origin + `/lists/${linkedSlug}`, {
    redirect: "manual",
  });
  assert.equal(redirect.status, 307);
  assert.equal(
    new URL(redirect.headers.get("location"), origin).searchParams.get(
      "returnTo",
    ),
    `/lists/${linkedSlug}`,
  );
  checks += 2;
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
    [{ id: list[0].id, cantidad: 1, medida: 1, precio: 0, unit: "bad" }],
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
  const homeAfterCreate = await req(
    "/api/households?view=home",
    "GET",
    undefined,
    user,
  );
  assert.equal(homeAfterCreate.lists.length, 2);
  assert.ok(homeAfterCreate.lists.some((household) => household.id === second));
  const createdSlug = (
    await db.query("select slug from preview_lists.households where id=$1", [
      second,
    ])
  ).rows[0].slug;
  assert.deepEqual(await req(`/api/households?slug=${createdSlug}`), {
    kind: "member",
    id: second,
  });
  checks += 2;
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
  const bulkProducts = ["old-product", newProduct.id];
  await req(
    "/api/products/bulk-edit-products",
    "PUT",
    { productIds: bulkProducts, idCategory: category.id },
    user,
    403,
  );
  await req(
    "/api/products/bulk-edit-products",
    "PUT",
    {
      productIds: bulkProducts,
      idCategory: category.id,
      availableUnits: ["un", "kg", "lt"],
    },
    admin,
  );
  const bulkUpdated = (await req("/api/products/get-products", "GET", undefined, outsider))
    .filter((p) => bulkProducts.includes(p.id));
  assert.equal(bulkUpdated.length, 2);
  assert.ok(bulkUpdated.every((p) => p.id_category === category.id));
  assert.ok(bulkUpdated.every((p) => p.availableUnits.includes("lt")));
  checks += 3;
  await req(
    "/api/products/bulk-edit-products",
    "PUT",
    { productIds: ["old-product"], availableUnits: ["lt"] },
    admin,
    409,
  );
  const bulkDeleteNames = ["Lote para borrar uno", "Lote para borrar dos"];
  for (const name of bulkDeleteNames)
    await req(
      "/api/products/add-product",
      "POST",
      {
        name,
        idCategory: category.id,
        unit: "kg",
        availableUnits: ["kg", "lt"],
      },
      admin,
    );
  const bulkDeleteProducts = (await req("/api/products/get-products", "GET", undefined, outsider))
    .filter((p) => bulkDeleteNames.includes(p.name));
  assert.equal(bulkDeleteProducts.length, 2);
  assert.ok(bulkDeleteProducts.every((p) => p.availableUnits.includes("lt")));
  await req(
    "/api/products/bulk-edit-products",
    "PUT",
    { productIds: bulkDeleteProducts.map((p) => p.id), action: "delete" },
    admin,
  );
  assert.ok(
    !(await req("/api/products/get-products", "GET", undefined, outsider)).some(
      (p) => bulkDeleteNames.includes(p.name),
    ),
  );
  checks += 3;
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
  const sharing = await req(
    "/api/households",
    "POST",
    { action: "share", email: outsider },
    user,
    200,
    second,
  );
  const secondSlug = (await req("/api/households")).household.slug;
  assert.notEqual(secondSlug, linkedSlug);
  assert.equal(sharing.result.slug, secondSlug);
  checks++;
  const recipientBefore = await req(
    "/api/households",
    "GET",
    undefined,
    outsider,
  );
  assert.notEqual(recipientBefore.household.id, second);
  await req(
    "/api/households",
    "POST",
    { action: "switch", id: recipientBefore.household.id },
    outsider,
  );
  const ownerIndex = await req("/api/households?view=home");
  assert.equal(
    ownerIndex.lists.filter((list) => list.owner_email === user).length,
    2,
  );
  const pendingIndex = await req(
    "/api/households?view=home",
    "GET",
    undefined,
    outsider,
  );
  assert.equal(pendingIndex.lists.length, 1);
  assert.equal(pendingIndex.invitations.length, 1);
  assert.equal(pendingIndex.invitations[0].slug, secondSlug);
  checks += 4;
  const sharedPath = `/api/households?slug=${secondSlug}`;
  await req(
    "/api/products/edit-checked-product",
    "PUT",
    { idProduct: newProduct.id, checked: true },
    outsider,
    403,
    second,
  );
  await req(
    "/api/products/edit-checked-product",
    "PUT",
    { idProduct: newProduct.id, checked: true },
    null,
    401,
    second,
  );
  const invitationLink = await req(sharedPath, "GET", undefined, outsider);
  assert.equal(invitationLink.kind, "invitation");
  assert.equal(invitationLink.name, "Otra lista");
  await req(sharedPath, "GET", undefined, admin, 403);
  checks += 2;
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
  assert.deepEqual(await req(sharedPath, "GET", undefined, outsider), {
    kind: "member",
    id: second,
  });
  const duplicateShare = await req(
    "/api/households",
    "POST",
    { action: "share", email: outsider },
    user,
    400,
    second,
  );
  assert.equal(duplicateShare.error, "La persona ya pertenece a la lista");
  checks++;
  const selectedShared = await req(
    "/api/households",
    "GET",
    undefined,
    outsider,
    200,
    second,
  );
  assert.equal(selectedShared.household.slug, secondSlug);
  checks++;
  const unchangedOwn = await req("/api/households", "GET", undefined, outsider);
  assert.equal(unchangedOwn.household.id, recipientBefore.household.id);
  const acceptedIndex = await req(
    "/api/households?view=home",
    "GET",
    undefined,
    outsider,
  );
  assert.equal(acceptedIndex.lists.length, 2);
  assert.equal(acceptedIndex.invitations.length, 0);
  assert.ok(
    acceptedIndex.lists.some(
      (list) => list.slug === secondSlug && list.owner_email === user,
    ),
  );
  checks += 4;
  const shared = await req(
    "/api/households",
    "GET",
    undefined,
    outsider,
    200,
    second,
  );
  assert.equal(shared.role, "user");
  assert.equal(shared.canEditList, true);
  assert.equal(shared.canManageList, false);
  checks += 2;
  await req(
    "/api/products/edit-checked-product",
    "PUT",
    { idProduct: newProduct.id, checked: true },
    outsider,
    200,
    second,
  );
  await req(
    "/api/products/edit-checked-product",
    "PUT",
    { idProduct: newProduct.id, checked: false },
    outsider,
    200,
    second,
  );
  await db.query(
    "delete from preview_lists.shopping_list where household_id=$1 and id_product=$2 and not comprado",
    [second, newProduct.id],
  );
  await req(
    "/api/historical/add-historical",
    "POST",
    { productIds: [list[0].id] },
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
  assert.ok(
    (await req("/api/list/get-list", "GET", undefined, user, 200, second)).some(
      (item) => item.id_product === newProduct.id,
    ),
  );
  checks++;
  const ownerAfterAcceptance = await req(
    "/api/households",
    "GET",
    undefined,
    user,
    200,
    second,
  );
  assert.equal(ownerAfterAcceptance.pending.length, 0);
  assert.ok(ownerAfterAcceptance.members.some((m) => m.email === outsider));
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from preview_lists.household_invitations where household_id=$1",
        [second],
      )
    ).rows[0].n,
    0,
  );
  checks += 3;
  // Stale invitation rows must not be rendered as pending for active members.
  await db.query(
    "insert into preview_lists.household_invitations(household_id,email) values($1,$2)",
    [second, outsider],
  );
  assert.equal(
    (await req("/api/households", "GET", undefined, user, 200, second)).pending
      .length,
    0,
  );
  assert.equal(
    (await req("/api/households?view=home", "GET", undefined, outsider))
      .invitations.length,
    0,
  );
  assert.equal(
    (await req(sharedPath, "GET", undefined, outsider)).kind,
    "member",
  );
  await db.query(
    "delete from preview_lists.household_invitations where household_id=$1 and email=$2",
    [second, outsider],
  );
  checks += 3;
  await req(
    "/api/households",
    "POST",
    { action: "rename", name: "No permitido" },
    outsider,
    403,
    second,
  );
  await req(
    "/api/households",
    "POST",
    { action: "suggest-name", name: "Nombre propuesto" },
    outsider,
    200,
    second,
  );
  const proposed = (
    await req("/api/households", "GET", undefined, user, 200, second)
  ).nameSuggestions[0];
  assert.equal(
    (await req("/api/households", "GET", undefined, user, 200, second))
      .household.name,
    "Otra lista",
  );
  await req(
    "/api/households",
    "POST",
    { action: "review-name", id: proposed.id, decision: "approve" },
    outsider,
    403,
    second,
  );
  await req(
    "/api/households",
    "POST",
    { action: "review-name", id: proposed.id, decision: "approve" },
    user,
    404,
    homeB,
  );
  await req(
    "/api/households",
    "POST",
    { action: "review-name", id: proposed.id, decision: "approve" },
    user,
    200,
    second,
  );
  assert.equal(
    (await req("/api/households", "GET", undefined, user, 200, second))
      .household.name,
    "Nombre propuesto",
  );
  await req(
    "/api/households",
    "POST",
    { action: "review-name", id: proposed.id, decision: "approve" },
    user,
    400,
    second,
  );
  await req(
    "/api/households",
    "POST",
    { action: "suggest-name", name: "" },
    outsider,
    400,
    second,
  );
  await req(
    "/api/households",
    "POST",
    { action: "suggest-name", name: "Anonymous" },
    null,
    401,
    second,
  );
  await req(
    "/api/households",
    "POST",
    { action: "suggest-name", name: "Other list" },
    outsider,
    403,
    homeB,
  );
  await req(
    "/api/households",
    "POST",
    { action: "suggest-name", name: "Rechazar este nombre" },
    outsider,
    200,
    second,
  );
  const rejected = (
    await req("/api/households", "GET", undefined, user, 200, second)
  ).nameSuggestions.find((s) => s.status === "pending");
  await req(
    "/api/households",
    "POST",
    { action: "review-name", id: rejected.id, decision: "reject" },
    user,
    200,
    second,
  );
  assert.equal(
    (await req("/api/households", "GET", undefined, user, 200, second))
      .household.name,
    "Nombre propuesto",
  );
  checks++;
  const collaborativeItem = (
    await req("/api/list/get-list", "GET", undefined, outsider, 200, second)
  )[0];
  await req(
    "/api/list/update-multiple-products",
    "PUT",
    [
      {
        id: collaborativeItem.id,
        cantidad: 3,
        medida: 1,
        precio: 0,
        unit: "un",
      },
    ],
    outsider,
    200,
    second,
  );
  assert.equal(
    Number(
      (await req("/api/list/get-list", "GET", undefined, user, 200, second))[0]
        .cantidad,
    ),
    3,
  );
  await req(
    "/api/products/edit-checked-product",
    "PUT",
    { idProduct: newProduct.id, checked: true },
    outsider,
    403,
    homeB,
  );
  await req(
    "/api/list/update-multiple-products",
    "PUT",
    [
      {
        id: collaborativeItem.id,
        cantidad: 9,
        medida: 1,
        precio: 0,
        unit: "un",
      },
    ],
    user,
    404,
    homeB,
  );
  checks += 3;
  await req(
    "/api/households",
    "POST",
    { action: "revoke", email: outsider },
    user,
    200,
    second,
  );
  await req("/api/list/get-list", "GET", undefined, outsider, 403, second);
  await req(sharedPath, "GET", undefined, outsider, 403);
  await req(
    "/api/list/set-bought",
    "PUT",
    { idList: list[0].id, cantidad: 0.5, medida: 1, precio: 1000, unit: "kg" },
    user,
    200,
    own.household.id,
  );
  const beforePartial = (
    await db.query(
      "select name,slug from preview_lists.households where id=$1",
      [own.household.id],
    )
  ).rows[0];
  await req(
    "/api/products/edit-checked-product",
    "PUT",
    { idProduct: newProduct.id, checked: true },
    user,
    200,
    own.household.id,
  );
  await req(
    "/api/list/add-list",
    "POST",
    undefined,
    user,
    200,
    own.household.id,
  );
  const pendingItem = (
    await req(
      "/api/list/get-list",
      "GET",
      undefined,
      user,
      200,
      own.household.id,
    )
  ).find((item) => item.id_product === newProduct.id);
  const partialBody = { productIds: [list[0].id] };
  await req(
    "/api/historical/add-historical",
    "POST",
    { productIds: [] },
    user,
    400,
    own.household.id,
  );
  await req(
    "/api/historical/add-historical",
    "POST",
    { productIds: [list[0].id, list[0].id] },
    user,
    400,
    own.household.id,
  );
  await req(
    "/api/historical/add-historical",
    "POST",
    { productIds: [pendingItem.id] },
    user,
    409,
    own.household.id,
  );
  await req(
    "/api/historical/add-historical",
    "POST",
    partialBody,
    user,
    409,
    second,
  );
  // Force failure after snapshots and selections changed: everything must roll back.
  const historyBefore = (
    await db.query(
      "select count(*)::int n from preview_lists.historical where household_id=$1",
      [own.household.id],
    )
  ).rows[0].n;
  await db.exec(`create function preview_lists.reject_partial_delete() returns trigger language plpgsql as $$ begin raise exception 'forced local rollback'; end $$;
    create trigger reject_partial_delete before delete on preview_lists.shopping_list for each row execute function preview_lists.reject_partial_delete();`);
  await req(
    "/api/historical/add-historical",
    "POST",
    partialBody,
    user,
    500,
    own.household.id,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from preview_lists.historical where household_id=$1",
        [own.household.id],
      )
    ).rows[0].n,
    historyBefore,
  );
  assert.equal(
    (
      await db.query(
        "select checked from preview_lists.list_selections where household_id=$1 and product_id=$2",
        [own.household.id, list[0].id_product],
      )
    ).rows[0].checked,
    true,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from preview_lists.shopping_list where household_id=$1 and id=$2",
        [own.household.id, list[0].id],
      )
    ).rows[0].n,
    1,
  );
  await db.exec(
    "drop trigger reject_partial_delete on preview_lists.shopping_list; drop function preview_lists.reject_partial_delete();",
  );
  checks += 3;
  const archiveResponses = await Promise.all(
    [0, 1].map(async () => {
      const response = await fetch(origin + "/api/historical/add-historical", {
        method: "POST",
        headers: {
          cookie: await cookie(user),
          "content-type": "application/json",
          "X-List-ID": own.household.id,
        },
        body: JSON.stringify(partialBody),
      });
      return { status: response.status, result: await response.json() };
    }),
  );
  assert.deepEqual(archiveResponses.map((r) => r.status).sort(), [200, 409]);
  const completed = archiveResponses.find((r) => r.status === 200).result;
  assert.match(
    completed.purchaseName,
    /^Masaje lista \[\d{2}\/\d{2}\/\d{2}-\d{2}:\d{2}:\d{2}\]$/,
  );
  assert.deepEqual(
    (
      await db.query(
        "select name,slug from preview_lists.households where id=$1",
        [own.household.id],
      )
    ).rows[0],
    beforePartial,
  );
  assert.equal(
    (
      await db.query(
        "select checked from preview_lists.list_selections where household_id=$1 and product_id=$2",
        [own.household.id, pendingItem.id_product],
      )
    ).rows[0].checked,
    true,
  );
  checks += 4;
  const history = await req(
    "/api/historical/get-historical",
    "GET",
    undefined,
    user,
    200,
    own.household.id,
  );
  const archived = history.items.find((i) => i.purchase.name === "Queso");
  assert.ok(archived);
  assert.equal(archived.purchase.purchase_name, completed.purchaseName);
  assert.equal(archived.purchase.purchase_id, completed.purchaseId);
  assert.equal(archived.purchase.list_name, beforePartial.name);
  const time = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(archived.purchasedAt));
  const part = (type) => time.find((p) => p.type === type).value;
  assert.equal(
    completed.purchaseName,
    `${beforePartial.name} [${part("day")}/${part("month")}/${part("year")}-${part("hour")}:${part("minute")}:${part("second")}]`,
  );
  checks += 5;
  const remaining = await req(
    "/api/list/get-list",
    "GET",
    undefined,
    user,
    200,
    own.household.id,
  );
  assert.deepEqual(
    remaining.map((item) => item.id),
    [pendingItem.id],
  );
  await req(
    "/api/list/set-bought",
    "PUT",
    { idList: pendingItem.id, cantidad: 2, medida: 1, precio: 0, unit: "un" },
    user,
    200,
    own.household.id,
  );
  await req(
    "/api/historical/add-historical",
    "POST",
    partialBody,
    user,
    409,
    own.household.id,
  );
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
    )[0].id,
    pendingItem.id,
  );
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
  checks += 3;
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
