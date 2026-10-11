"use server";
import { withHousehold, text, requireRow, DataError } from "../lib/database";
import type { Product, ProductChecked, AddProduct } from "../lib/types";
export interface EditProductParams {
  idProduct: string;
  newNameProduct: string;
}
export async function getProducts(): Promise<Product[]> {
  return withHousehold(
    async (db, h) =>
      (
        await db.query(
          "select id,name,id_category,checked from products where household_id=$1 order by name,id",
          [h],
        )
      ).rows,
  );
}
export async function addProduct(p: AddProduct): Promise<void> {
  await withHousehold(async (db, h) => {
    await db.query(
      "insert into products(household_id,name,id_category) values($1,$2,$3)",
      [h, text(p.name), text(p.idCategory)],
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
  await withHousehold(async (db, h) => {
    requireRow(
      (
        await db.query(
          "update products set name=$3 where household_id=$1 and id=$2",
          [h, text(p.idProduct), text(p.newNameProduct)],
        )
      ).rowCount,
    );
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
