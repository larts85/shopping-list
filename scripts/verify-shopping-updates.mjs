import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { encode } from "next-auth/jwt";
import pg from "pg";
const origin = process.env.TEST_ORIGIN || "http://localhost:2036";
if (!/^http:\/\/localhost:\d+$/.test(origin))
  throw new Error("Local server required");
const email = `shopping-qa-${randomUUID()}@example.invalid`;
const outsider = `shopping-outsider-${randomUUID()}@example.invalid`;
const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
async function cookie(email) {
  return `authjs.session-token=${await encode({ secret, salt: "authjs.session-token", token: { email, name: "QA" }, maxAge: 600 })}`;
}
const own = await cookie(email),
  other = await cookie(outsider);
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
  session = own,
  status = 200,
) {
  const response = await fetch(origin + path, {
    method,
    headers: { cookie: session, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  assert.equal(response.status, status, `${path}: ${JSON.stringify(result)}`);
  checks++;
  return result;
}
try {
  await request("/api/historical/get-historical", "GET", undefined, "", 401);
  await request("/api/categories/add-category", "POST", "QA unidades");
  const [category] = await request("/api/categories/get-categories");
  await request("/api/products/add-product", "POST", {
    name: "Leche QA",
    idCategory: category.id,
    unit: "lt",
  });
  await request(
    "/api/products/add-product",
    "POST",
    { name: "Inválido", idCategory: category.id, unit: "bad" },
    own,
    400,
  );
  const [product] = await request("/api/products/get-products");
  assert.equal(product.unit, "lt");
  await request("/api/products/edit-checked-product", "PUT", {
    idProduct: product.id,
    checked: true,
  });
  await request("/api/list/add-list", "POST");
  const [item] = await request("/api/list/get-list");
  assert.equal(item.unit, "lt");
  for (const cantidad of [-2, 0, null, "", true, "NaN"]) {
    await request(
      "/api/list/update-multiple-products",
      "PUT",
      [{ id: item.id, cantidad, medida: 1, unit: "lt" }],
      own,
      400,
    );
  }
  await request(
    "/api/list/update-multiple-products",
    "PUT",
    [{ id: item.id, cantidad: 2, medida: 1, unit: "kg" }],
    own,
    400,
  );
  await request("/api/list/update-multiple-products", "PUT", [
    { id: item.id, cantidad: 2, medida: 1, unit: "ml" },
  ]);
  assert.equal((await request("/api/list/get-list"))[0].unit, "ml");
  await request(
    "/api/list/set-bought",
    "PUT",
    { idList: item.id, cantidad: -1, medida: 1, precio: 100, unit: "lt" },
    own,
    400,
  );
  await request(
    "/api/list/set-bought",
    "PUT",
    { idList: item.id, cantidad: 1.5, medida: 1, precio: 100, unit: "lt" },
    other,
    404,
  );
  await request("/api/list/set-bought", "PUT", {
    idList: item.id,
    cantidad: 1.5,
    medida: 1,
    precio: 100,
    unit: "lt",
  });
  await request(
    "/api/list/update-multiple-products",
    "PUT",
    [{ id: item.id, cantidad: 3, medida: 1, unit: "lt" }],
    own,
    400,
  );
  await Promise.all([
    request("/api/historical/add-historical", "POST"),
    request("/api/historical/add-historical", "POST"),
  ]);
  const history = await request("/api/historical/get-historical");
  assert.equal(history.items.length, 1);
  assert.equal(history.items[0].purchase.unit, "lt");
  assert.equal(history.items[0].purchase.precio_total, 150);
  assert.equal(
    (await request("/api/historical/get-historical", "GET", undefined, other))
      .items.length,
    0,
  );
  await request(
    "/api/historical/get-historical?page=-1",
    "GET",
    undefined,
    own,
    400,
  );
  await request("/api/products/edit-name-product", "PUT", {
    idProduct: product.id,
    newNameProduct: "Leche nueva",
    unit: "kg",
  });
  assert.equal(
    (await request("/api/historical/get-historical")).items[0].purchase.name,
    "Leche QA",
  );
  const result = await pool.query(
    "select household_id from user_preferences where email=$1",
    [email],
  );
  const h = result.rows[0].household_id;
  // Verify pagination retains all items and cannot reveal another household's records.
  await pool.query(
    "insert into historical(household_id,purchase) select $1,jsonb_build_object('name','QA page','cantidad',1,'precio_total',10) from generate_series(1,50)",
    [h],
  );
  assert.equal((await request("/api/historical/get-historical")).hasMore, true);
  assert.equal(
    (await request("/api/historical/get-historical?page=1")).items.length,
    1,
  );
  await request("/api/products/edit-checked-product", "PUT", {
    idProduct: product.id,
    checked: true,
  });
  await request("/api/list/add-list", "POST");
  const [newItem] = await request("/api/list/get-list");
  assert.equal(newItem.unit, "kg");
  // Simulate an accepted member to verify both users read/write the same open list.
  await request("/api/categories/get-categories", "GET", undefined, other);
  await pool.query(
    "insert into household_members(household_id,email) values($1,$2)",
    [h, outsider],
  );
  await pool.query(
    "update user_preferences set household_id=$1 where email=$2",
    [h, outsider],
  );
  assert.equal(
    (await request("/api/list/get-list", "GET", undefined, other))[0].id,
    newItem.id,
  );
  await request(
    "/api/list/update-multiple-products",
    "PUT",
    [{ id: newItem.id, cantidad: 500, medida: 1, unit: "g" }],
    other,
  );
  assert.equal((await request("/api/list/get-list"))[0].cantidad, "500");
  await pool.query(
    "delete from household_members where household_id=$1 and email=$2",
    [h, outsider],
  );
  assert.equal(
    (await request("/api/list/get-list", "GET", undefined, other)).length,
    0,
  );
  console.info(
    `PASS: ${checks} shopping API checks (positive quantities, compatible units, snapshots, pagination, shared list access/revocation).`,
  );
} finally {
  await pool.query("delete from user_preferences where email=any($1::text[])", [
    [email, outsider],
  ]);
  await pool.query("delete from households where owner_email=any($1::text[])", [
    [email, outsider],
  ]);
  await pool.end();
}
