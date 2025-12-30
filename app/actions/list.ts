"use server";
import { GoogleSpreadsheetRow } from "google-spreadsheet";
import { sheetDoc } from "../lib/googleFileSheetConection";
import { getProductsChecked } from "./products";
import { IList } from "../lib/types";

export async function addList(): Promise<void> {
  const doc = await sheetDoc();
  await doc.loadInfo();
  const sheetList = doc.sheetsByTitle["list"];

  if (sheetList) {
    const rowsList = await sheetList.getRows();
    let maxId = 0;

    rowsList.forEach((row: GoogleSpreadsheetRow) => {
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

    const existingProducts = rowsList.map((row) => row.get("id_product"));

    const productChecked = await getProductsChecked();

    const productsToAdd = productChecked.filter(
      (product) => !existingProducts.includes(product.id)
    );

    for (const item of productsToAdd) {
      const newId = ++maxId;
      const id = newId.toString();

      const data = {
        id: id,
        id_product: item.id,
        name: item.name,
        id_category: item.id_category,
        cantidad: "",
        medida: "",
        precio: "",
        total: "",
        comprado: "",
      };

      await sheetList.addRow(data);
    }
  } else {
    throw new Error('Sheet named "list" not found');
  }
}

export async function getList(): Promise<IList[]> {
  const doc = await sheetDoc();
  await doc.loadInfo();
  const sheetList = doc.sheetsByTitle["list"];

  if (sheetList) {
    const rowsList = await sheetList.getRows();
    const productList: IList[] = rowsList.map((row) => ({
      id: row.get("id") || "",
      id_product: row.get("id_product") || "",
      name: row.get("name") || "",
      id_category: row.get("id_category") || "",
      cantidad: row.get("cantidad") || "",
      medida: row.get("medida") || "",
      precio: row.get("precio") || "",
      precioTotal: row.get("precio_total") || "",
      precioKg: row.get("precio_kg") || "",
      kgTotal: row.get("kg_total") || "",
      comprado: row.get("comprado") || "",
    }));

    return productList;
  } else {
    throw new Error('No se encontró la hoja "list" en Google Sheets');
  }
}

export async function setBought(
  id: string,
  cantidad: number,
  medida: number,
  precio: number
): Promise<void> {
  const doc = await sheetDoc();
  await doc.loadInfo();
  const sheetList = doc.sheetsByTitle["list"];

  if (sheetList) {
    const rowsList = await sheetList.getRows();

    const rowToUpdate = rowsList.find((row) => row.get("id") === id);

    if (rowToUpdate) {
      const precioKg = precio / medida;
      const total = cantidad * precio;
      const kgTotal = cantidad * medida;

      const currencyFormatter = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      });

      rowToUpdate.set("cantidad", cantidad);
      rowToUpdate.set("medida", medida);
      rowToUpdate.set("precio", currencyFormatter.format(precio));
      rowToUpdate.set("precio_total", currencyFormatter.format(total));
      rowToUpdate.set("precio_kg", currencyFormatter.format(precioKg));
      rowToUpdate.set("kg_total", kgTotal);
      rowToUpdate.set("comprado", "1");

      await rowToUpdate.save();
    } else {
      throw new Error(`No se encontró la fila con el ID: ${id}`);
    }
  } else {
    throw new Error('No se encontró la hoja "list" en Google Sheets');
  }
}

export async function getListProductsByCategories() {
  const productsList = await getList();
  if (!productsList) {
    throw new Error(`Could not get shopping list`);
  }
  const productListByCategories = productsList.reduce((acc, productList) => {
    if (!acc[productList.id_category]) {
      acc[productList.id_category] = [];
    }
    acc[productList.id_category].push(productList);
    return acc;
  }, {} as Record<string, IList[]>);

  const filteredProductListByCategories = Object.fromEntries(
    Object.entries(productListByCategories).filter(
      ([key, products]) => products.length > 0
    )
  );

  return filteredProductListByCategories;
}

export async function shoppingList() {
  const list = await getList();
  if (!list) {
    throw new Error('No se encontró la hoja "list" en Google Sheets');
  }

  const shoppingList = list.filter(
    (productList) => productList.comprado === "1"
  );
  return shoppingList;
}

export async function deleteShoppingList(): Promise<void> {
  try {
    const doc = await sheetDoc();
    await doc.loadInfo();

    const sheetProducts = doc.sheetsByTitle["list"];
    if (!sheetProducts) {
      throw new Error('Sheet "Products" not found');
    }

    const rowsProducts = await sheetProducts.getRows();
    for (const row of rowsProducts) {
      if (row.get("comprado") === "1") {
        await row.delete();
      }
    }
  } catch (error) {
    console.error("Error eliminando productos comprados:", error);
  }
}

export async function updateMultipleProducts(
  products: {
    id: string;
    cantidad: number;
    medida: number;
    precio: number;
  }[]
): Promise<void> {
  const doc = await sheetDoc();
  await doc.loadInfo();
  const sheetList = doc.sheetsByTitle["list"];

  if (sheetList) {
    const rowsList = await sheetList.getRows();

    const currencyFormatter = new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    });

    for (const product of products) {
      const rowToUpdate = rowsList.find((row) => row.get("id") === product.id);

      if (rowToUpdate) {
        const precioKg = product.precio / product.medida;
        const total = product.cantidad * product.precio;
        const kgTotal = product.cantidad * product.medida;

        rowToUpdate.set("cantidad", product.cantidad);
        rowToUpdate.set("medida", product.medida);
        rowToUpdate.set("kg_total", kgTotal);

        await rowToUpdate.save();
      } else {
        console.warn(`No se encontró la fila con el ID: ${product.id}`);
      }
    }
  } else {
    throw new Error('No se encontró la hoja "list" en Google Sheets');
  }
}
