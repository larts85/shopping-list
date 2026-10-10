"use server";
import { withHousehold, text, requireRow, DataError } from "../lib/database";
import { isUnit, compatibleUnits } from "../lib/units";
import { suggestProductUnit } from "../lib/productUnits";
import type { Unit } from "../lib/units";
import type { Product, ProductChecked, AddProduct } from "../lib/types";
export interface EditProductParams {
  idProduct: string;
  newNameProduct: string;
  unit?: Unit;
}
export async function getProducts(): Promise<Product[]> {
  return withHousehold(
    async (db, h) =>
      (
        await db.query(
          "select id,name,id_category,checked,unit from products where household_id=$1 order by name,id",
          [h],
        )
      ).rows,
  );
}
export async function addProduct(p: AddProduct): Promise<void> {
  if (p.unit !== undefined && !isUnit(p.unit))
    throw new DataError("Unidad inválida");
  await withHousehold(async (db, h) => {
    const category = await db.query(
      "select name from categories where household_id=$1 and id=$2",
      [h, text(p.idCategory)],
    );
    requireRow(category.rowCount);
    await db.query(
      "insert into products(household_id,name,id_category,unit) values($1,$2,$3,$4)",
      [
        h,
        text(p.name),
        text(p.idCategory),
        p.unit ?? suggestProductUnit(text(p.name), category.rows[0].name),
      ],
    );
  });
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
  await withHousehold(async (db, h) => {
    const previous = await db.query(
      "select unit from products where household_id=$1 and id=$2 for update",
      [h, text(p.idProduct)],
    );
    requireRow(previous.rowCount);
    if (p.unit !== undefined)
      await db.query(
        "update shopping_list set unit=$3 where household_id=$1 and id_product=$2 and unit is null",
        [h, text(p.idProduct), previous.rows[0].unit],
      );
    requireRow(
      (
        await db.query(
          "update products set name=$3,unit=coalesce($4,unit) where household_id=$1 and id=$2",
          [h, text(p.idProduct), text(p.newNameProduct), p.unit ?? null],
        )
      ).rowCount,
    );
    if (p.unit !== undefined) {
      // Keep a chosen g/ml unit on a rename or compatible default change.
      // Changing the selling dimension cannot reinterpret an old item count.
      await db.query(
        "update shopping_list set unit=$3,cantidad=null,medida=null,precio=null where household_id=$1 and id_product=$2 and not comprado and not (unit=any($4::text[]))",
        [h, p.idProduct, p.unit, compatibleUnits(p.unit)],
      );
      await db.query(
        "update shopping_list set unit=$3 where household_id=$1 and id_product=$2 and not comprado and cantidad is null",
        [h, p.idProduct, p.unit],
      );
    }
  });
}
export async function editCheckedProduct(p: ProductChecked): Promise<void> {
  if (typeof p.checked !== "boolean") throw new DataError("Selección inválida");
  await withHousehold(async (db, h) => {
    requireRow(
      (
        await db.query(
          "update products set checked=$3 where household_id=$1 and id=$2",
          [h, text(p.idProduct), p.checked],
        )
      ).rowCount,
    );
  });
}
export async function editCheckedProducts(products: Product[]): Promise<void> {
  if (!Array.isArray(products)) throw new DataError("Productos inválidos");
  await withHousehold(async (db, h) => {
    for (const p of products) {
      if (typeof p.checked !== "boolean")
        throw new DataError("Selección inválida");
      requireRow(
        (
          await db.query(
            "update products set checked=$3 where household_id=$1 and id=$2",
            [h, text(p.id), p.checked],
          )
        ).rowCount,
      );
    }
  });
}
export async function unCheckProducts(): Promise<void> {
  await withHousehold(async (db, h) => {
    await db.query(
      "update products set checked=false where household_id=$1 and id in(select id_product from shopping_list where household_id=$1 and comprado)",
      [h],
    );
  });
}
export async function deleteProductById(id: string): Promise<void> {
  await withHousehold(async (db, h) => {
    requireRow(
      (
        await db.query("delete from products where household_id=$1 and id=$2", [
          h,
          text(id),
        ])
      ).rowCount,
    );
  });
}
