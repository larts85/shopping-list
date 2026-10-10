"use server";
import {
  withHousehold,
  text,
  positive,
  requireRow,
  DataError,
} from "../lib/database";
import type { IList } from "../lib/types";
export async function addList(): Promise<void> {
  await withHousehold(async (db, h) => {
    await db.query(
      "insert into shopping_list(household_id,id_product) select household_id,id from products where household_id=$1 and checked on conflict(household_id,id_product) do nothing",
      [h],
    );
  });
}
export async function getList(): Promise<IList[]> {
  return withHousehold(async (db, h) => {
    const { rows } = await db.query(
      `select l.*,p.name,p.id_category from shopping_list l join products p on p.id=l.id_product and p.household_id=l.household_id where l.household_id=$1 order by p.name,l.id`,
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
    }));
  });
}
export async function setBought(
  id: string,
  cantidad: number,
  medida: number,
  precio: number,
): Promise<void> {
  await withHousehold(async (db, h) => {
    requireRow(
      (
        await db.query(
          "update shopping_list set cantidad=$3,medida=$4,precio=$5,comprado=true where household_id=$1 and id=$2",
          [
            h,
            text(id),
            positive(cantidad),
            positive(medida),
            positive(precio, true),
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
  await withHousehold(async (db, h) => {
    await db.query(
      "delete from shopping_list where household_id=$1 and comprado",
      [h],
    );
  });
}
export async function updateMultipleProducts(
  products: { id: string; cantidad: number; medida: number; precio: number }[],
): Promise<void> {
  if (!Array.isArray(products)) throw new DataError("Lista inválida");
  await withHousehold(async (db, h) => {
    for (const p of products)
      requireRow(
        (
          await db.query(
            "update shopping_list set cantidad=$3,medida=$4 where household_id=$1 and id=$2",
            [h, text(p.id), positive(p.cantidad), positive(p.medida)],
          )
        ).rowCount,
      );
  });
}
