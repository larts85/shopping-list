"use server";
import {
  withHousehold,
  withListItemEditor,
  withListEditor,
  withCatalog,
  text,
  requireRow,
  DataError,
} from "../lib/database";
import { isUnit } from "../lib/units";
import { suggestProductUnit } from "../lib/productUnits";
import type { Unit } from "../lib/units";
import type { Product, ProductChecked, AddProduct } from "../lib/types";
export interface EditProductParams {
  idProduct: string;
  newNameProduct: string;
  unit?: Unit;
}
export async function getProducts(scope?: string): Promise<Product[]> {
  return withHousehold(
    async (db, h) =>
      (
        await db.query(
          "select p.id,p.name,p.id_category,coalesce(s.checked,false) checked,p.unit from catalog_products p left join list_selections s on s.product_id=p.id and s.household_id=$1 where not p.archived order by p.name,p.id",
          [h],
        )
      ).rows,
    scope,
  );
}
export async function addProduct(p: AddProduct): Promise<void> {
  if (p.unit !== undefined && !isUnit(p.unit))
    throw new DataError("Unidad inválida");
  await withCatalog(async (db) => {
    const category = await db.query(
      "select name from catalog_categories where id=$1 and not archived",
      [text(p.idCategory)],
    );
    requireRow(category.rowCount);
    await db.query(
      "insert into catalog_products(name,id_category,unit) values($1,$2,$3)",
      [
        text(p.name),
        p.idCategory,
        p.unit ?? suggestProductUnit(p.name, category.rows[0].name),
      ],
    );
  }, true);
}
export async function getProductsByCategory(id: string): Promise<Product[]> {
  return (await getProducts()).filter((p) => p.id_category === text(id));
}
export async function getProductsByCategories(): Promise<
  Record<string, Product[]>
> {
  return (await getProducts()).reduce(
    (a, p) => {
      (a[p.id_category] ||= []).push(p);
      return a;
    },
    {} as Record<string, Product[]>,
  );
}
export async function getProductsChecked(): Promise<Product[]> {
  return (await getProducts()).filter((p) => p.checked);
}
export async function editNameProduct(p: EditProductParams): Promise<void> {
  if (p.unit !== undefined && !isUnit(p.unit))
    throw new DataError("Unidad inválida");
  await withCatalog(async (db) => {
    const previous = await db.query(
      "select unit from catalog_products where id=$1 and not archived for update",
      [text(p.idProduct)],
    );
    requireRow(previous.rowCount);
    if (p.unit !== undefined && p.unit !== previous.rows[0].unit) {
      if (
        (
          await db.query("select 1 from shopping_list where id_product=$1", [
            p.idProduct,
          ])
        ).rowCount
      )
        throw new DataError(
          "No se puede cambiar la unidad mientras haya compras activas de este producto",
          409,
        );
    }
    requireRow(
      (
        await db.query(
          "update catalog_products set name=$2,unit=coalesce($3,unit) where id=$1 and not archived",
          [p.idProduct, text(p.newNameProduct), p.unit ?? null],
        )
      ).rowCount,
    );
  }, true);
}
async function selectProduct(
  db: import("pg").PoolClient,
  h: string,
  id: string,
  checked: boolean,
) {
  requireRow(
    (
      await db.query(
        "select 1 from catalog_products where id=$1 and not archived",
        [text(id)],
      )
    ).rowCount,
  );
  await db.query(
    "insert into list_selections(household_id,product_id,checked) values($1,$2,$3) on conflict(household_id,product_id) do update set checked=excluded.checked",
    [h, id, checked],
  );
}
export async function editCheckedProduct(p: ProductChecked): Promise<void> {
  if (typeof p.checked !== "boolean") throw new DataError("Selección inválida");
  await withListItemEditor(async (db, h) =>
    selectProduct(db, h, p.idProduct, p.checked),
  );
}
export async function editCheckedProducts(products: Product[]): Promise<void> {
  if (!Array.isArray(products) || products.length > 500)
    throw new DataError("Productos inválidos");
  await withListItemEditor(async (db, h) => {
    for (const p of products) {
      if (typeof p.checked !== "boolean")
        throw new DataError("Selección inválida");
      await selectProduct(db, h, p.id, p.checked);
    }
  });
}
export async function unCheckProducts(): Promise<void> {
  await withListEditor(async (db, h) => {
    await db.query(
      "update list_selections set checked=false where household_id=$1 and product_id in(select id_product from shopping_list where household_id=$1 and comprado)",
      [h],
    );
  });
}
export async function deleteProductById(id: string): Promise<void> {
  await withCatalog(async (db) => {
    requireRow(
      (
        await db.query(
          "update catalog_products set archived=true where id=$1 and not archived",
          [text(id)],
        )
      ).rowCount,
    );
  }, true);
}
