"use server";
import { GoogleSpreadsheetRow } from "google-spreadsheet";
import { sheetDoc } from "../lib/googleFileSheetConection";
import { Product } from "../lib/types";
import { ProductChecked } from "../lib/types";
import { AddProduct } from "../lib/types";
import { shoppingList } from "./list";

export async function addProduct(product: AddProduct): Promise<void> {
  const doc = await sheetDoc();
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle["products"];
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
        console.log("No ID found in row:", row);
      }
    });
    const newId = maxId + 1;
    const id = newId.toString();
    const data = {
      id,
      name: product.name,
      id_category: product.idCategory,
      checked: "0",
    };
    await sheet.addRow(data);
  } else {
    throw new Error('Sheet named "product" not found');
  }
}

export async function getProducts(): Promise<Product[]> {
  const doc = await sheetDoc();
  await doc.loadInfo();
  const sheetProducts = doc.sheetsByTitle["products"];
  if (sheetProducts) {
    const rows = await sheetProducts.getRows();

    const plainRows = rows.map((row) => ({
      id: row.get("id"),
      name: row.get("name"),
      id_category: row.get("id_category"),
      checked: row.get("checked"),
    }));
    return plainRows;
  } else {
    throw new Error("No se encontro la hoja Productos de Google Sheet");
  }
}

export async function getProductsByCategory(
  id_category: string
): Promise<Product[]> {
  if (id_category) {
    const products = await getProducts();
    if (products) {
      const productsByCategory = products.filter(
        (product) => product.id_category === id_category
      );
      return productsByCategory;
    } else {
      throw new Error("No se encontro la hoja Productos de Google Sheet");
    }
  } else {
    throw new Error("El id de categoria no es valido");
  }
}

export async function getProductsByCategories() {
  const products = await getProducts();
  if (!products) {
    throw new Error("No se encontro la hoja Productos de Google Sheet");
  }
  const productsByCategories = products.reduce((acc, product) => {
    if (!acc[product.id_category]) {
      acc[product.id_category] = [];
    }
    acc[product.id_category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);
}

export async function getProductsChecked(): Promise<Product[]> {
  const doc = await sheetDoc();
  await doc.loadInfo();
  const sheetProducts = doc.sheetsByTitle["products"];
  if (sheetProducts) {
    const rows = await sheetProducts.getRows();

    const plainRows = rows.map((row) => ({
      id: row.get("id"),
      name: row.get("name"),
      id_category: row.get("id_category"),
      checked: row.get("checked"),
    }));
    const productsChecked = plainRows.filter(
      (product) => product.checked === "1"
    );
    return productsChecked;
  } else {
    throw new Error("No se encontro la hoja Productos de Google Sheet");
  }
}

export interface EditProductParams {
  idProduct: string;
  newNameProduct: string;
}

export async function editNameProduct(
  product: EditProductParams
): Promise<void> {
  try {
    const { idProduct, newNameProduct } = product;
    const doc = await sheetDoc();
    await doc.loadInfo();
    const sheetProducts = doc.sheetsByTitle["products"];
    if (!sheetProducts) {
      throw new Error('Sheet "Products" not found');
    }
    const rowsProducts = await sheetProducts.getRows();
    const findProductRow = rowsProducts.find(
      (row) => row.get("id") === idProduct
    );
    if (!findProductRow) {
      throw new Error(`No row found with id:${idProduct}`);
    }
    findProductRow.set("name", newNameProduct);
    await findProductRow.save();
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function editCheckedProduct(
  productChecked: ProductChecked
): Promise<void> {
  try {
    const checked = productChecked.checked ? "1" : "0";
    const doc = await sheetDoc();
    await doc.loadInfo();
    const sheetProducts = doc.sheetsByTitle["products"];
    if (!sheetProducts) {
      throw new Error('Sheet "Products" not found');
    }
    const rowsProducts = await sheetProducts.getRows();
    const findProductRow = rowsProducts.find(
      (row) => row.get("id") === productChecked.idProduct
    );
    if (!findProductRow) {
      throw new Error(`No row found with id:${productChecked.idProduct}`);
    }

    findProductRow.set("checked", checked);
    await findProductRow.save();
  } catch (error) {
    console.error(error);
  }
}

export async function editCheckedProducts(
  productsChecked: Product[]
): Promise<void> {
  try {
    // Crear diccionario con productos chequeados y convertirlo a formato string con 0 y 1
    const checkedDict = productsChecked.reduce(
      (acc: { [key: string]: string }, product) => {
        acc[product.id] = product.checked ? "1" : "0";
        return acc;
      },
      {}
    ); //ejemplo {"1":"1","2":"1","3":"0"}
    const doc = await sheetDoc();
    await doc.loadInfo();

    const sheetProducts = doc.sheetsByTitle["products"];
    if (!sheetProducts) {
      throw new Error('Sheet "Products" not found');
    }

    const rowsProducts = await sheetProducts.getRows();

    for (const rowProduct of rowsProducts) {
      const rowId = rowProduct.get("id");
      if (checkedDict.hasOwnProperty(rowId)) {
        rowProduct.set("checked", checkedDict[rowId]);
        await rowProduct.save();
      }
    }
  } catch (error) {
    console.error("Error updating products:", error);
  }
}

export async function unCheckProducts(): Promise<void> {
  try {
    const doc = await sheetDoc();
    await doc.loadInfo();

    const sheetProducts = doc.sheetsByTitle["products"];
    if (!sheetProducts) {
      throw new Error('Sheet "products" not found');
    }

    const rowsProducts = await sheetProducts.getRows();

    const purchasedProducts = await shoppingList();

    const purchasedProductIds = new Set(
      purchasedProducts.map((product) => product.id_product)
    );

    for (const row of rowsProducts) {
      const rowProductId = row.get("id");
      if (purchasedProductIds.has(rowProductId)) {
        row.set("checked", "0");
        await row.save();
      }
    }
  } catch (error) {
    console.error("Error updating products:", error);
  }
}

export async function deleteProductById(idProduct: string): Promise<void> {
  const doc = await sheetDoc();
  await doc.loadInfo();

  const sheetProducts = doc.sheetsByTitle["products"];

  if (sheetProducts) {
    const rows = await sheetProducts.getRows();
    const findRow = rows.find((row) => row.get("id") === idProduct);
    if (findRow) {
      await findRow.delete();
    }
  } else {
    throw new Error('Sheet named "categories" not found');
  }
}
