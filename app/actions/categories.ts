"use server";
import { withHousehold, text, requireRow } from "../lib/database";
import type { Category, EditCategoryParams } from "../lib/types";
export async function getCategories(): Promise<Category[]> {
  return withHousehold(
    async (db, h) =>
      (
        await db.query(
          "select id,name from categories where household_id=$1 order by name,id",
          [h],
        )
      ).rows,
  );
}
export async function addCategory(name: string): Promise<void> {
  await withHousehold(async (db, h) => {
    await db.query("insert into categories(household_id,name) values($1,$2)", [
      h,
      text(name),
    ]);
  });
}
export async function editCategory(c: EditCategoryParams): Promise<void> {
  await withHousehold(async (db, h) => {
    requireRow(
      (
        await db.query(
          "update categories set name=$3 where household_id=$1 and id=$2",
          [h, text(c.idCategory), text(c.newNameCategory)],
        )
      ).rowCount,
    );
  });
}
export async function deleteCategoryById(id: string): Promise<void> {
  await withHousehold(async (db, h) => {
    requireRow(
      (
        await db.query(
          "delete from categories where household_id=$1 and id=$2",
          [h, text(id)],
        )
      ).rowCount,
    );
  });
}
