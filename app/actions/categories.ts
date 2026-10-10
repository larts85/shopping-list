"use server";

import { GoogleSpreadsheetRow } from "google-spreadsheet";
import { sheetDoc } from "../lib/googleFileSheetConection";
import { Category } from "../lib/types";
import { EditCategoryParams } from "../lib/types";

export async function getCategories(): Promise<Category[]> {
  const doc = await sheetDoc();
  await doc.loadInfo();
  const sheetCategories = doc.sheetsByTitle["categories"];

  if (sheetCategories) {
    const rows = await sheetCategories.getRows();
    const plainRows: Category[] = rows.map((row: GoogleSpreadsheetRow) => ({
      id: row.get("id") as string,
      name: row.get("name") as string,
    }));
    return plainRows;
  } else {
    throw new Error('Sheet named "categories" not found');
  }
}

export async function addCategory(nameCategory: string): Promise<void> {
  const doc = await sheetDoc();
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle["categories"];
  if (sheet) {
    const rows = await sheet.getRows();
    let maxId = 0;

    rows.forEach((row: GoogleSpreadsheetRow) => {
      const rawId = row.get("id") as string;
      if (rawId) {
        const currentId = parseInt(rawId, 10);
        if (!isNaN(currentId) && currentId > maxId) {
          maxId = currentId;
        }
      } else {
        console.debug("No ID found in row:", row);
      }
    });
    const newId = maxId + 1;
    const id = newId.toString();
    const data = {
      id: id,
      name: nameCategory,
    };
    await sheet.addRow(data);
  } else {
    throw new Error('Sheet named "categorias" not found');
  }
}

export async function deleteCategoryById(idCategory: string): Promise<void> {
  const doc = await sheetDoc();
  await doc.loadInfo();
  const sheetCategory = doc.sheetsByTitle["categories"];
  if (sheetCategory) {
    const rows = await sheetCategory.getRows();

    const findRow = rows.find((row) => row.get("id") === idCategory);
    if (findRow) {
      await findRow.delete();
    }
  } else {
    throw new Error('Sheet named "categories" not found');
  }
}

export async function editCategory(
  category: EditCategoryParams
): Promise<void> {
  try {
    const { idCategory, newNameCategory } = category;
    const doc = await sheetDoc();
    await doc.loadInfo();
    const sheetCategory = doc.sheetsByTitle["categories"];
    if (!sheetCategory) {
      throw new Error('Sheet "categories" not found');
    }
    const rows = await sheetCategory.getRows();
    const findRow = rows.find((row) => row.get("id") === idCategory);

    if (!findRow) {
      throw new Error(`No row found with id: ${idCategory}`);
    }

    findRow.set("name", newNameCategory);
    await findRow.save();
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
}
