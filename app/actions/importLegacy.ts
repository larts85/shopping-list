"use server";
import { randomUUID } from "node:crypto";
import { signIn } from "@/auth";
import { identity, withHousehold, text, DataError } from "../lib/database";
export async function authorizeImport(): Promise<void> {
  await identity();
  await signIn(
    "google",
    { redirectTo: "/logistic/data" },
    {
      scope:
        "openid email profile https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly",
      prompt: "consent",
    },
  );
}
async function readLegacy(source: string) {
  const input = text(source);
  const id = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)?.[1] || input;
  if (!/^[a-zA-Z0-9_-]{20,}$/.test(id))
    throw new DataError("Enlace o ID de planilla inválido");
  const { session } = await identity();
  if (!session.accessToken)
    throw new DataError("Autoriza la lectura de tu planilla antes de importar");
  const metadataResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=properties(locale)`,
    {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
    },
  );
  if (!metadataResponse.ok)
    throw new DataError("No se pudo leer la configuración de la planilla");
  const metadata = (await metadataResponse.json()) as {
    properties: { locale: string };
  };
  const params = new URLSearchParams();
  for (const tab of ["categories", "products", "list", "historical"])
    params.append("ranges", tab);
  params.set("valueRenderOption", "UNFORMATTED_VALUE");
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${id}/values:batchGet?${params}`,
    {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
    },
  );
  if (!response.ok)
    throw new DataError(
      "No se pudo leer la planilla. Autoriza la lectura y comprueba que las pestañas categories, products, list e historical existen.",
    );
  const data = (await response.json()) as {
    valueRanges: { values?: unknown[][] }[];
  };
  const sheets = data.valueRanges.map((range) => {
    const [header, ...rows] = range.values || [];
    const used = new Set<string>();
    const columns = (header || []).map((column, i) => {
      const original = String(column).trim() || `column_${i + 1}`;
      let key = original;
      let suffix = 2;
      while (used.has(key)) key = `${original}_${suffix++}`;
      used.add(key);
      return key;
    });
    return rows
      .filter((row) => row.some((v) => v !== ""))
      .map((row) =>
        Object.fromEntries(columns.map((column, i) => [column, row[i] ?? ""])),
      );
  });
  if (sheets.length !== 4)
    throw new DataError("Faltan pestañas en la planilla");
  return { id, sheets, locale: metadata.properties.locale };
}
export async function previewLegacy(source: string) {
  const { sheets } = await readLegacy(source);
  return sheets.map((rows, index) => ({
    tab: ["categories", "products", "list", "historical"][index],
    count: rows.length,
    columns: rows.length ? Object.keys(rows[0]) : [],
    names: rows
      .filter((row) => /QA Codex/i.test(String(row.name)))
      .map((row) => String(row.name)),
  }));
}
export async function importLegacy(source: string) {
  const { id, sheets, locale } = await readLegacy(source);
  const [categories, products, list, historical] = sheets;
  const number = (value: unknown) => {
    if (value === "" || value == null) return null;
    if (typeof value === "number") {
      if (!Number.isFinite(value))
        throw new DataError("La planilla contiene un número inválido");
      return value;
    }
    const parts = new Intl.NumberFormat(locale.replace("_", "-")).formatToParts(
      1234.5,
    );
    const group = parts.find((part) => part.type === "group")?.value || ",";
    const decimal = parts.find((part) => part.type === "decimal")?.value || ".";
    const input = String(value).trim().replace(/[$\s]/g, "");
    const normalized = input.split(group).join("").replace(decimal, ".");
    if (!/^-?\d+(?:\.\d+)?$/.test(normalized))
      throw new DataError("La planilla contiene un número inválido");
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed))
      throw new DataError("La planilla contiene un número inválido");
    return parsed;
  };
  const checked = (v: unknown) =>
    v === true || String(v) === "1" || String(v).toLowerCase() === "true";
  return withHousehold(async (db, h, email) => {
    {
      if (
        !(
          await db.query(
            "select 1 from households where id=$1 and owner_email=$2",
            [h, email],
          )
        ).rowCount
      )
        throw new DataError("Solo el propietario puede importar", 403);
    }
    if (
      (
        await db.query("select 1 from legacy_imports where household_id=$1", [
          h,
        ])
      ).rowCount
    )
      throw new DataError("Este hogar ya fue importado");
    if (
      (
        await db.query(
          "select 1 from categories where household_id=$1 union all select 1 from products where household_id=$1 union all select 1 from historical where household_id=$1 limit 1",
          [h],
        )
      ).rowCount
    )
      throw new DataError(
        "Importa en un hogar vacío para evitar duplicar datos",
      );
    const categoryIds = new Map<string, string>();
    const productIds = new Map<string, string>();
    for (const c of categories) {
      const key = text(String(c.id));
      if (categoryIds.has(key))
        throw new DataError("Categoría duplicada en la planilla");
      const newId = randomUUID();
      categoryIds.set(key, newId);
      await db.query(
        "insert into categories(id,household_id,name) values($1,$2,$3)",
        [newId, h, text(c.name)],
      );
    }
    for (const p of products) {
      const key = text(String(p.id));
      if (productIds.has(key))
        throw new DataError("Producto duplicado en la planilla");
      const category = categoryIds.get(String(p.id_category));
      if (!category)
        throw new DataError(
          `El producto ${p.name} tiene una categoría inexistente`,
        );
      const newId = randomUUID();
      productIds.set(key, newId);
      await db.query(
        "insert into products(id,household_id,name,id_category,checked) values($1,$2,$3,$4,$5)",
        [newId, h, text(p.name), category, checked(p.checked)],
      );
    }
    for (const row of list) {
      const product = productIds.get(String(row.id_product));
      if (!product)
        throw new DataError(
          `La lista contiene un producto inexistente: ${row.name}`,
        );
      await db.query(
        "insert into shopping_list(household_id,id_product,cantidad,medida,precio,comprado) values($1,$2,$3,$4,$5,$6)",
        [
          h,
          product,
          number(row.cantidad),
          number(row.medida),
          number(row.precio),
          checked(row.comprado),
        ],
      );
    }
    for (const row of historical) {
      // Preserve every original field, including the original date and formatted prices.
      await db.query(
        "insert into historical(household_id,purchase) values($1,$2)",
        [h, JSON.stringify(row)],
      );
    }
    await db.query(
      "insert into legacy_imports(household_id,sheet_id) values($1,$2)",
      [h, id],
    );
    return {
      categories: categories.length,
      products: products.length,
      list: list.length,
      historical: historical.length,
    };
  });
}

export async function findLegacySheets(): Promise<
  { id: string; name: string }[]
> {
  const { session } = await identity();
  if (!session.accessToken)
    throw new DataError("Autoriza la lectura de Google antes de buscar");
  const query = new URLSearchParams({
    q: "name = 'homeLogisticSheet' and trashed = false and mimeType = 'application/vnd.google-apps.spreadsheet'",
    fields: "files(id,name)",
    pageSize: "100",
  });
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?${query}`,
    {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
    },
  );
  if (!response.ok)
    throw new DataError(
      "Autoriza la lectura de Google o pega el enlace de la planilla",
    );
  const result = await response.json();
  return result.files || [];
}

export async function verifyLegacyImport() {
  const source = await withHousehold(async (db, h, email) => {
    if (
      !(
        await db.query(
          "select 1 from households where id=$1 and owner_email=$2",
          [h, email],
        )
      ).rowCount
    )
      throw new DataError("Solo el propietario puede verificar", 403);
    const result = await db.query(
      "select sheet_id from legacy_imports where household_id=$1",
      [h],
    );
    if (!result.rowCount) throw new DataError("Este hogar no fue importado");
    return result.rows[0].sheet_id as string;
  });
  const { sheets } = await readLegacy(source);
  const [categories, products, list, historical] = sheets;
  const checked = (v: unknown) =>
    v === true || String(v) === "1" || String(v).toLowerCase() === "true";
  const canonical = (value: Record<string, unknown>) =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
      ),
    );
  const same = (a: Record<string, unknown>[], b: Record<string, unknown>[]) =>
    JSON.stringify(a.map(canonical).sort()) ===
    JSON.stringify(b.map(canonical).sort());
  return withHousehold(async (db, h) => {
    const actualCategories = (
      await db.query("select name from categories where household_id=$1", [h])
    ).rows;
    const actualProducts = (
      await db.query(
        "select p.name,c.name as category,p.checked from products p join categories c on c.id=p.id_category and c.household_id=p.household_id where p.household_id=$1",
        [h],
      )
    ).rows;
    const actualHistorical = (
      await db.query("select purchase from historical where household_id=$1", [
        h,
      ])
    ).rows.map((row) => row.purchase as Record<string, unknown>);
    const categoryNames = new Map(
      categories.map((row) => [String(row.id), row.name]),
    );
    const actualList = (
      await db.query(
        "select count(*)::int as count from shopping_list where household_id=$1",
        [h],
      )
    ).rows[0].count;
    return {
      categories: actualCategories.length,
      products: actualProducts.length,
      list: actualList,
      historical: actualHistorical.length,
      matches:
        same(
          categories.map(({ name }) => ({ name })),
          actualCategories,
        ) &&
        same(
          products.map((row) => ({
            name: row.name,
            category: categoryNames.get(String(row.id_category)),
            checked: checked(row.checked),
          })),
          actualProducts,
        ) &&
        list.length === actualList &&
        same(historical, actualHistorical),
    };
  });
}
