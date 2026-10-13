"use server";
import { randomUUID } from "node:crypto";
import { completedPurchaseName } from "../lib/completedPurchase";
import {
  DataError,
  text,
  withHousehold,
  withListEditor,
} from "../lib/database";
export async function addHistorical(productIds: unknown) {
  if (
    !Array.isArray(productIds) ||
    !productIds.length ||
    productIds.length > 500
  )
    throw new DataError("Marca productos comprados antes de finalizar");
  const ids = productIds.map((id) => text(id));
  if (new Set(ids).size !== ids.length)
    throw new DataError("Productos duplicados");
  return withListEditor(async (db, h) => {
    // withListEditor serializes all mutations of this cart in one transaction.
    // Only the confirmed row IDs can be archived, including on retries.
    const selected = await db.query(
      "select id from shopping_list where household_id=$1 and comprado and id=any($2::text[])",
      [h, ids],
    );
    if (selected.rowCount !== ids.length)
      throw new DataError(
        "La compra ya se finalizó o los productos cambiaron. Actualiza la lista.",
        409,
      );
    const household = await db.query(
      "select name from households where id=$1",
      [h],
    );
    const purchasedAt = new Date();
    const purchaseName = completedPurchaseName(
      household.rows[0].name,
      purchasedAt,
    );
    const purchaseId = randomUUID();
    await db.query(
      `insert into historical(household_id,purchase,purchased_at)
   select l.household_id,jsonb_build_object('id_list',l.id,'id_product',l.id_product,'name',coalesce(p.name,l.provisional_name),'id_category',coalesce(p.id_category,l.provisional_category_id),
    'purchase_id',$3::text,'purchase_name',$4::text,'list_name',$5::text,
    'unit',l.unit,'cantidad',l.cantidad,'medida',l.medida,'precio',l.precio,'precio_total',l.cantidad*l.precio,'precio_kg',l.precio/l.medida,'kg_total',l.cantidad*l.medida),$6::timestamptz
   from shopping_list l left join catalog_products p on p.id=l.id_product where l.household_id=$1 and l.comprado and l.id=any($2::text[])`,
      [h, ids, purchaseId, purchaseName, household.rows[0].name, purchasedAt],
    );
    await db.query(
      "update list_selections set checked=false where household_id=$1 and product_id in(select id_product from shopping_list where household_id=$1 and comprado and id=any($2::text[]))",
      [h, ids],
    );
    await db.query(
      "delete from shopping_list where household_id=$1 and comprado and id=any($2::text[])",
      [h, ids],
    );
    return { purchaseId, purchaseName, count: ids.length };
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
