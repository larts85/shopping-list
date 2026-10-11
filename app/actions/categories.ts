"use server";
import { withCatalog, text, requireRow, DataError } from "../lib/database";
import type { Category, EditCategoryParams } from "../lib/types";
export async function getCategories(): Promise<Category[]> {
  return withCatalog(
    async (db) =>
      (
        await db.query(
          "select id,name from catalog_categories where not archived order by name,id",
        )
      ).rows,
  );
}
export async function addCategory(name: string): Promise<void> {
  await withCatalog(async (db) => {
    await db.query("insert into catalog_categories(name) values($1)", [
      text(name),
    ]);
  }, true);
}
export async function editCategory(c: EditCategoryParams): Promise<void> {
  await withCatalog(async (db) => {
    requireRow(
      (
        await db.query(
          "update catalog_categories set name=$2 where id=$1 and not archived",
          [text(c.idCategory), text(c.newNameCategory)],
        )
      ).rowCount,
    );
  }, true);
}
export async function deleteCategoryById(id: string): Promise<void> {
  await withCatalog(async (db) => {
    if (
      (
        await db.query(
          "select 1 from catalog_products where id_category=$1 and not archived",
          [text(id)],
        )
      ).rowCount
    )
      throw new DataError(
        "La categoría contiene productos; retíralos antes",
        409,
      );
    requireRow(
      (
        await db.query(
          "update catalog_categories set archived=true where id=$1 and not archived",
          [id],
        )
      ).rowCount,
    );
  }, true);
}
