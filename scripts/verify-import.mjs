// Runs the real importer with synthetic Google responses and an isolated Postgres household.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import ts from "typescript";
const require = createRequire(import.meta.url);
const email = `migration-test-${randomUUID()}@example.invalid`;
function load(file, overrides) {
  const source = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", source)(
    (id) => (id in overrides ? overrides[id] : require(id)),
    module,
    module.exports,
  );
  return module.exports;
}
const database = load("app/lib/database.ts", {
  "server-only": {},
  "@/auth": {
    auth: async () => ({
      user: { email },
      accessToken: "synthetic-test-token",
    }),
  },
});
const importer = load("app/actions/importLegacy.ts", {
  "@/auth": {
    signIn: async () => {
      throw new Error("OAuth must not run in tests");
    },
  },
  "../lib/database": database,
});
const originalFetch = globalThis.fetch;
let locale = "es_AR",
  ranges,
  calls = 0,
  checks = 0;
const sheetId = "synthetic_fixture_sheet_123456789";
globalThis.fetch = async (url) => {
  assert(String(url).startsWith("https://sheets.googleapis.com/"));
  calls++;
  return Response.json(
    String(url).includes("values:batchGet")
      ? { valueRanges: ranges.map((values) => ({ values })) }
      : { properties: { locale } },
  );
};
const base = () => [
  [
    ["id", "name"],
    ["1", "Fixture category"],
  ],
  [
    ["id", "name", "id_category", "checked"],
    ["1", "Fixture product", "1", true],
  ],
  [
    ["id_product", "cantidad", "medida", "precio", "comprado"],
    ["1", "2", "0,5", "$ 1.234,50", true],
  ],
  [
    ["name", "fecha", "fecha"],
    ["Fixture product", "2020-01-01", "original date"],
  ],
];
const counts = () =>
  database.withHousehold(
    async (db, h) =>
      (
        await db.query(
          "select (select count(*)::int from categories where household_id=$1) categories,(select count(*)::int from products where household_id=$1) products,(select count(*)::int from shopping_list where household_id=$1) list,(select count(*)::int from historical where household_id=$1) historical,(select count(*)::int from legacy_imports where household_id=$1) imports",
          [h],
        )
      ).rows[0],
  );
const reset = () =>
  database.withHousehold(async (db, h) => {
    for (const table of [
      "legacy_imports",
      "historical",
      "shopping_list",
      "products",
      "categories",
    ])
      await db.query(`delete from ${table} where household_id=$1`, [h]);
  });
async function rejected(change) {
  ranges = base();
  change(ranges);
  await assert.rejects(() => importer.importLegacy(sheetId));
  checks++;
  assert.deepEqual(await counts(), {
    categories: 0,
    products: 0,
    list: 0,
    historical: 0,
    imports: 0,
  });
  checks++;
}
try {
  ranges = base();
  await assert.rejects(() => importer.importLegacy("invalid"), /inválido/);
  assert.equal(calls, 0);
  checks++;
  const preview = await importer.previewLegacy(sheetId);
  assert.equal(preview[3].columns[2], "fecha_2");
  checks++;
  await rejected((r) => r[0].push(["1", "Duplicate category"]));
  await rejected((r) => r[1].push(["1", "Duplicate product", "1", false]));
  await rejected((r) => (r[1][1][2] = "missing"));
  await rejected((r) => (r[2][1][0] = "missing"));
  await rejected((r) => (r[2][1][1] = "NaN"));
  await rejected((r) => (r[2][1][2] = 0));
  await rejected((r) => (r[2][1][3] = -1));
  await rejected((r) => r[2].push(r[2][1]));
  ranges = base();
  assert.deepEqual(await importer.importLegacy(sheetId), {
    categories: 1,
    products: 1,
    list: 1,
    historical: 1,
  });
  checks++;
  await database.withHousehold(async (db, h) => {
    const row = (
      await db.query(
        "select cantidad::float8,medida::float8,precio::float8,comprado from shopping_list where household_id=$1",
        [h],
      )
    ).rows[0];
    assert.deepEqual(row, {
      cantidad: 2,
      medida: 0.5,
      precio: 1234.5,
      comprado: true,
    });
    checks++;
    assert.deepEqual(
      (
        await db.query(
          "select purchase from historical where household_id=$1",
          [h],
        )
      ).rows[0].purchase,
      {
        name: "Fixture product",
        fecha: "2020-01-01",
        fecha_2: "original date",
      },
    );
    checks++;
  });
  await assert.rejects(
    () => importer.importLegacy(sheetId),
    /ya fue importado/,
  );
  checks++;
  assert.deepEqual(await counts(), {
    categories: 1,
    products: 1,
    list: 1,
    historical: 1,
    imports: 1,
  });
  checks++;
  await reset();
  locale = "en_US";
  ranges = base();
  ranges[2][1] = ["1", 2, "0.5", "$ 1,234.50", true];
  await importer.importLegacy(sheetId);
  await database.withHousehold(async (db, h) => {
    assert.equal(
      (
        await db.query(
          "select precio::float8 from shopping_list where household_id=$1",
          [h],
        )
      ).rows[0].precio,
      1234.5,
    );
    checks++;
  });
  await reset();
  ranges = base();
  ranges[2][1] = ["1", 2, 0.5, 0, true];
  await importer.importLegacy(sheetId);
  checks++;
  await reset();
  await database.withHousehold(async (db, h) =>
    db.query("insert into categories(household_id,name) values($1,$2)", [
      h,
      "Existing fixture",
    ]),
  );
  await assert.rejects(() => importer.importLegacy(sheetId), /hogar vacío/);
  checks++;
  assert.equal((await counts()).categories, 1);
  checks++;
  console.info(
    `PASS: ${checks} importer checks (synthetic Sheets, real isolated Postgres)`,
  );
} finally {
  globalThis.fetch = originalFetch;
  await database.transaction(email, async (db) => {
    await db.query("delete from user_preferences where email=$1", [email]);
    await db.query("delete from households where owner_email=$1", [email]);
  });
  await globalThis.logisticsPool.end();
  delete globalThis.logisticsPool;
}
