// Run with node --env-file=.env scripts/update-argentina-catalog.mjs --household UUID [--apply].
// Catalog-only update: receipts, prices, identities and invoice details are not imported.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";
const args = process.argv.slice(2);
const household = args[args.indexOf("--household") + 1];
assert(
  args.includes("--household") && /^[a-f0-9-]{36}$/i.test(household),
  "An explicit household UUID is required",
);
const apply = args.includes("--apply");
const catalog = JSON.parse(
  readFileSync(
    new URL("../data/argentina-catalog.json", import.meta.url),
    "utf8",
  ),
);
const normalize = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
assert(
  new Set(catalog.map((p) => normalize(p.name))).size === catalog.length,
  "Duplicate catalog names",
);
for (const p of catalog)
  assert(
    p.name && p.category && ["un", "kg", "g", "lt", "ml"].includes(p.unit),
    "Invalid catalog item",
  );
const pool = new pg.Pool({
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT),
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_PASSWORD_DB,
  database: "postgres",
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync(
      new URL("../supabase/certs/prod-ca-2021.crt", import.meta.url),
      "utf8",
    ),
  },
  connectionTimeoutMillis: 10000,
});
const db = await pool.connect();
try {
  await db.query("begin");
  assert.equal(
    (
      await db.query(
        `select id from households where id=$1 ${apply ? "for update" : ""}`,
        [household],
      )
    ).rowCount,
    1,
    "Household not found",
  );
  const categories = (
    await db.query("select * from categories where household_id=$1", [
      household,
    ])
  ).rows;
  const products = (
    await db.query("select * from products where household_id=$1", [household])
  ).rows;
  const list = (
    await db.query("select * from shopping_list where household_id=$1", [
      household,
    ])
  ).rows;
  const history = async () =>
    (
      await db.query(
        "select count(*)::int as count,md5(coalesce(string_agg(id::text || purchase::text || purchased_at::text,'' order by id),'')) as hash from historical where household_id=$1",
        [household],
      )
    ).rows[0];
  const beforeHistory = await history();
  const categoriesByName = new Map(
    categories.map((c) => [normalize(c.name), c.id]),
  );
  const productsByName = new Map(products.map((p) => [normalize(p.name), p]));
  const newCategories = [...new Set(catalog.map((p) => p.category))].filter(
    (c) => !categoriesByName.has(normalize(c)),
  );
  const additions = catalog.filter(
    (p) => !productsByName.has(normalize(p.name)),
  );
  // Only backfill the legacy default; keep a user's explicit physical unit.
  const changes = catalog.flatMap((p) => {
    const old = productsByName.get(normalize(p.name));
    return old?.unit === "un" && p.unit !== "un"
      ? [{ id: old.id, name: old.name, from: old.unit, to: p.unit }]
      : [];
  });
  const summary = {
    pendingQuantitiesReset: list.filter(
      (l) =>
        !l.comprado &&
        l.cantidad !== null &&
        changes.some((c) => c.id === l.id_product),
    ).length,
    apply,
    categoriesAdded: newCategories.length,
    productsAdded: additions.length,
    unitsUpdated: changes,
  };
  if (apply) {
    const backup = `/private/tmp/argentina-catalog-before-${Date.now()}.json`;
    writeFileSync(
      backup,
      JSON.stringify(
        { household, categories, products, list, history: beforeHistory },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    for (const name of newCategories) {
      const { rows } = await db.query(
        "insert into categories(household_id,name) values($1,$2) returning id",
        [household, name],
      );
      categoriesByName.set(normalize(name), rows[0].id);
    }
    const mapping = JSON.stringify(
      changes.map((c) => ({ id: c.id, old_unit: c.from, new_unit: c.to })),
    );
    // Freeze historical counts, then update only open rows with the new dimension.
    await db.query(
      `update shopping_list l set unit=m.old_unit
      from jsonb_to_recordset($2::jsonb) as m(id text,old_unit text,new_unit text)
      where l.household_id=$1 and l.id_product=m.id and l.comprado and l.unit is null`,
      [household, mapping],
    );
    await db.query(
      `update products p set unit=m.new_unit
      from jsonb_to_recordset($2::jsonb) as m(id text,old_unit text,new_unit text)
      where p.household_id=$1 and p.id=m.id`,
      [household, mapping],
    );
    await db.query(
      `update shopping_list l set unit=m.new_unit,cantidad=null,medida=null,precio=null
      from jsonb_to_recordset($2::jsonb) as m(id text,old_unit text,new_unit text)
      where l.household_id=$1 and l.id_product=m.id and not l.comprado`,
      [household, mapping],
    );
    await db.query(
      `insert into products(household_id,name,id_category,unit,checked)
      select $1,p.name,p.id_category,p.unit,false
      from jsonb_to_recordset($2::jsonb) as p(name text,id_category text,unit text)`,
      [
        household,
        JSON.stringify(
          additions.map((p) => ({
            name: p.name,
            id_category: categoriesByName.get(normalize(p.category)),
            unit: p.unit,
          })),
        ),
      ],
    );
    assert.deepEqual(await history(), beforeHistory, "History must not change");
    const afterList = (
      await db.query("select * from shopping_list where household_id=$1", [
        household,
      ])
    ).rows;
    assert.equal(
      afterList.length,
      list.length,
      "Do not add items to the open list",
    );
    for (const old of list) {
      const item = afterList.find((p) => p.id === old.id);
      const reset =
        !old.comprado && changes.some((c) => c.id === old.id_product);
      for (const key of ["cantidad", "medida", "precio"])
        assert.equal(
          item[key],
          reset ? null : old[key],
          `Preserve purchased ${key}`,
        );
      for (const key of ["comprado", "id_product"])
        assert.equal(item[key], old[key]);
      if (old.comprado) {
        const product = products.find((p) => p.id === old.id_product);
        assert.equal(
          item.unit ?? product.unit,
          old.unit ?? product.unit,
          "Preserve purchased unit",
        );
      }
    }
    const afterProducts = (
      await db.query("select * from products where household_id=$1", [
        household,
      ])
    ).rows;
    for (const old of products) {
      const item = afterProducts.find((p) => p.id === old.id);
      assert(item);
      assert.equal(item.checked, old.checked);
      assert.equal(item.name, old.name);
      assert.equal(item.id_category, old.id_category);
    }
    assert(
      afterProducts
        .filter((p) => !products.some((old) => old.id === p.id))
        .every((p) => !p.checked),
    );
    summary.backup = backup;
    await db.query("commit");
  } else await db.query("rollback");
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  await db.query("rollback");
  throw error;
} finally {
  db.release();
  await pool.end();
}
