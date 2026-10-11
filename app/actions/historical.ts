"use server";
import { withHousehold, withListEditor } from "../lib/database";
export async function addHistorical(): Promise<void> {
  await withListEditor(async (db, h) => {
    await db.query(
      `insert into historical(household_id,purchase)
   select l.household_id,jsonb_build_object('id_list',l.id,'id_product',p.id,'name',p.name,'id_category',p.id_category,
    'unit',l.unit,'cantidad',l.cantidad,'medida',l.medida,'precio',l.precio,'precio_total',l.cantidad*l.precio,'precio_kg',l.precio/l.medida,'kg_total',l.cantidad*l.medida)
   from shopping_list l join catalog_products p on p.id=l.id_product where l.household_id=$1 and l.comprado`,
      [h],
    );
    await db.query(
      "update list_selections set checked=false where household_id=$1 and product_id in(select id_product from shopping_list where household_id=$1 and comprado)",
      [h],
    );
    await db.query(
      "delete from shopping_list where household_id=$1 and comprado",
      [h],
    );
  });
}

export async function getHistorical(page = 0) {
  if (!Number.isSafeInteger(page) || page < 0)
    throw new Error("Página inválida");
  return withHousehold(async (db, h) => {
    const { rows } = await db.query(
      "select id,purchase,purchased_at from historical where household_id=$1 order by purchased_at desc,id desc limit 51 offset $2",
      [h, page * 50],
    );
    return {
      hasMore: rows.length > 50,
      items: rows.slice(0, 50).map((r) => ({
        id: r.id as string,
        purchase: r.purchase as Record<string, string | number | null>,
        purchasedAt: r.purchased_at.toISOString() as string,
      })),
    };
  });
}
