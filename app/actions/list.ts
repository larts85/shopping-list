"use server";
import {
  withHousehold,
  withListItemEditor,
  withListEditor,
  text,
  positive,
  requireRow,
  DataError,
} from "../lib/database";
import {
  purchaseValues,
  requireCompatibleUnit,
} from "../lib/purchaseValidation";
import type { Unit } from "../lib/units";
import type { IList } from "../lib/types";
export async function addList(): Promise<void> {
  await withListItemEditor(async (db, h) => {
    await db.query(
      "insert into shopping_list(household_id,id_product,unit) select $1,p.id,p.unit from catalog_products p join list_selections s on s.product_id=p.id where s.household_id=$1 and s.checked and not p.archived on conflict(household_id,id_product) do nothing",
      [h],
    );
  });
}
export async function getList(scope?: string): Promise<IList[]> {
  return withHousehold(async (db, h) => {
    const { rows } = await db.query(
      `select l.*,p.name,p.id_category,p.unit as product_unit from shopping_list l join catalog_products p on p.id=l.id_product where l.household_id=$1 order by p.name,l.id`,
      [h],
    );
    const currency = (n: number) =>
      new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(n);
    return rows.map((r) => ({
      id: r.id,
      id_product: r.id_product,
      name: r.name,
      id_category: r.id_category,
      cantidad: r.cantidad ?? "",
      medida: r.medida ?? "",
      precio: r.precio == null ? "" : currency(Number(r.precio)),
      precioTotal:
        r.precio == null || r.cantidad == null
          ? ""
          : currency(Number(r.precio) * Number(r.cantidad)),
      precioKg:
        r.precio == null || r.medida == null
          ? ""
          : currency(Number(r.precio) / Number(r.medida)),
      kgTotal:
        r.cantidad == null || r.medida == null
          ? ""
          : String(Number(r.cantidad) * Number(r.medida)),
      comprado: r.comprado ? "1" : "",
      unit: r.unit ?? r.product_unit,
      productUnit: r.product_unit,
    }));
  }, scope);
}
export async function setBought(
  id: string,
  cantidad: number,
  medida: number,
  precio: number,
  unit?: Unit,
): Promise<void> {
  const values = purchaseValues(cantidad, medida, unit);
  const price = positive(precio, true);
  await withListEditor(async (db, h) => {
    const product = await db.query(
      "select p.unit from shopping_list l join catalog_products p on p.id=l.id_product where l.household_id=$1 and l.id=$2",
      [h, text(id)],
    );
    requireRow(product.rowCount);
    if (values.unit) requireCompatibleUnit(values.unit, product.rows[0].unit);
    requireRow(
      (
        await db.query(
          "update shopping_list set cantidad=$3,medida=$4,precio=$5,comprado=true,unit=coalesce($6,unit) where household_id=$1 and id=$2",
          [
            h,
            text(id),
            values.cantidad,
            values.medida,
            price,
            values.unit ?? null,
          ],
        )
      ).rowCount,
    );
  });
}
export async function getListProductsByCategories(): Promise<
  Record<string, IList[]>
> {
  return (await getList()).reduce(
    (a, p) => {
      (a[p.id_category] ||= []).push(p);
      return a;
    },
    {} as Record<string, IList[]>,
  );
}
export async function shoppingList(): Promise<IList[]> {
  return (await getList()).filter((p) => p.comprado === "1");
}
export async function deleteShoppingList(): Promise<void> {
  await withListEditor(async (db, h) => {
    await db.query(
      "delete from shopping_list where household_id=$1 and comprado",
      [h],
    );
  });
}
export async function updateMultipleProducts(
  products: {
    id: string;
    cantidad: number;
    medida: number;
    precio: number;
    unit?: Unit;
  }[],
): Promise<void> {
  if (!Array.isArray(products) || products.length > 500)
    throw new DataError("Lista inválida");
  const validated = products.map((p) => {
    if (!p || typeof p !== "object") throw new DataError("Producto inválido");
    return { id: text(p.id), ...purchaseValues(p.cantidad, p.medida, p.unit) };
  });
  await withListItemEditor(async (db, h) => {
    for (const p of validated) {
      const product = await db.query(
        "select l.comprado,p.unit from shopping_list l join catalog_products p on p.id=l.id_product where l.household_id=$1 and l.id=$2",
        [h, p.id],
      );
      requireRow(product.rowCount);
      if (product.rows[0].comprado)
        throw new DataError(
          "Registra nuevamente la compra para cambiar sus cantidades",
        );
      if (p.unit) requireCompatibleUnit(p.unit, product.rows[0].unit);
      requireRow(
        (
          await db.query(
            "update shopping_list set cantidad=$3,medida=$4,unit=coalesce($5,unit) where household_id=$1 and id=$2",
            [h, p.id, p.cantidad, p.medida, p.unit ?? null],
          )
        ).rowCount,
      );
    }
  });
}
