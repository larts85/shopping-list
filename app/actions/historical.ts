"use server";
import { withHousehold } from "../lib/database";
export async function addHistorical(): Promise<void> {
  await withHousehold(async (db, h) => {
    await db.query(
      `insert into historical(household_id,purchase)
   select l.household_id,jsonb_build_object('id_list',l.id,'id_product',p.id,'name',p.name,'id_category',p.id_category,
    'cantidad',l.cantidad,'medida',l.medida,'precio',l.precio,'precio_total',l.cantidad*l.precio,'precio_kg',l.precio/l.medida,'kg_total',l.cantidad*l.medida)
   from shopping_list l join products p on p.id=l.id_product and p.household_id=l.household_id where l.household_id=$1 and l.comprado`,
      [h],
    );
    await db.query(
      "update products set checked=false where household_id=$1 and id in(select id_product from shopping_list where household_id=$1 and comprado)",
      [h],
    );
    await db.query(
      "delete from shopping_list where household_id=$1 and comprado",
      [h],
    );
  });
}
