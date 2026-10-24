"use server";
import { randomUUID } from "node:crypto";
import { completedPurchaseName } from "../lib/completedPurchase";
import {
  DataError,
  identity,
  positive,
  text,
  transaction,
  withList,
  withListEditor,
} from "../lib/database";
import {
  compatibleUnits,
  isUnit,
  isUnitAllowedForCategory,
  requiresWholeQuantity,
} from "../lib/units";
import { purchaseDate, purchaseHistoryGroupKey } from "../lib/purchaseHistory";
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
      "select id from shopping_list where list_id=$1 and comprado and id=any($2::text[])",
      [h, ids],
    );
    if (selected.rowCount !== ids.length)
      throw new DataError(
        "La compra ya se finalizó o los productos cambiaron. Actualiza la lista.",
        409,
      );
    const  list = await db.query(
      "select name from lists where id=$1",
      [h],
    );
    const purchasedAt = new Date();
    const purchaseName = completedPurchaseName(
       list.rows[0].name,
      purchasedAt,
    );
    const purchaseId = randomUUID();
    await db.query(
      `insert into historical(list_id,purchase,purchased_at)
   select l.list_id,jsonb_build_object('id_list',l.id,'id_product',l.id_product,'name',coalesce(p.name,l.provisional_name),'description',l.description,'id_category',coalesce(p.id_category,l.provisional_category_id),
    'purchase_id',$3::text,'purchase_name',$4::text,'list_name',$5::text,
    'unit',l.unit,'cantidad',l.cantidad,'medida',l.medida,'precio',l.precio,'precio_total',coalesce(l.precio_total,case when l.precio is null then null else l.cantidad*l.precio end),'precio_kg',case when l.precio is null then null else l.precio/l.medida end,'kg_total',l.cantidad*l.medida),$6::timestamptz
   from shopping_list l left join catalog_products p on p.id=l.id_product where l.list_id=$1 and l.comprado and l.id=any($2::text[])`,
      [h, ids, purchaseId, purchaseName,  list.rows[0].name, purchasedAt],
    );
    await db.query(
      "update list_selections set checked=false where list_id=$1 and product_id in(select id_product from shopping_list where list_id=$1 and comprado and id=any($2::text[]))",
      [h, ids],
    );
    await db.query(
      "delete from shopping_list where list_id=$1 and comprado and id=any($2::text[])",
      [h, ids],
    );
    const completed = (
      await db.query(
        "select not exists(select 1 from shopping_list where list_id=$1) completed",
        [h],
      )
    ).rows[0].completed as boolean;
    if (completed) {
      await db.query(
        "update lists set status='completed' where id=$1 and status='active'",
        [h],
      );
      await db.query(
        "update list_selections set checked=false where list_id=$1",
        [h],
      );
      await db.query("delete from user_preferences where list_id=$1", [h]);
    }
    return { purchaseId, purchaseName, count: ids.length, completed };
  });
}

export async function getHistorical(page = 0) {
  if (!Number.isSafeInteger(page) || page < 0)
    throw new Error("Página inválida");
  const { email } = await identity();
  return transaction(email, async (db) => {
    const { rows } = await db.query(
      `select i.id,i.list_id as list_id,h.name as list_name,h.owner_email,
              i.purchase,i.purchased_at
       from historical i
       join lists h on h.id=i.list_id
       join list_members m on m.list_id=i.list_id and m.email=$1
       order by i.purchased_at desc,i.id desc limit 51 offset $2`,
      [email, page * 50],
    );
    return {
      hasMore: rows.length > 50,
      items: rows.slice(0, 50).map((r) => ({
        id: r.id as string,
        listId: r.list_id as string,
        listName: r.list_name as string,
        canEdit: r.owner_email === email,
        purchase: r.purchase as Record<string, string | number | null>,
        purchasedAt: r.purchased_at.toISOString() as string,
      })),
    };
  });
}

export async function updateHistoricalItem(
  id: unknown,
  input: unknown,
  scope?: string,
) {
  const historicalId = text(id);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      historicalId,
    )
  )
    throw new DataError("El producto histórico no es válido");
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new DataError("Datos del producto inválidos");
  const values = input as Record<string, unknown>;
  const name = text(values.name);
  if (typeof values.description !== "string" || values.description.length > 500)
    throw new DataError("La descripción no puede superar los 500 caracteres");
  const description = values.description.trim();
  const cantidad = positive(values.cantidad);
  const unit = values.unit;
  if (!isUnit(unit)) throw new DataError("Unidad inválida");
  if (requiresWholeQuantity(unit) && !Number.isInteger(cantidad))
    throw new DataError("La cantidad debe ser entera para esta unidad");
  const precio =
    values.precio === null || values.precio === ""
      ? null
      : positive(values.precio, true);
  const precioTotal = Object.hasOwn(values, "precio_total")
    ? values.precio_total === null || values.precio_total === ""
      ? null
      : positive(values.precio_total, true)
    : precio === null
      ? null
      : precio * cantidad;

  return withListEditor(async (db, listId) => {
    const patch = {
      name,
      description,
      cantidad,
      unit,
      precio,
      precio_total: precioTotal,
    };
    const result = await db.query(
      `update historical
       set purchase = purchase || $3::jsonb
       where list_id=$1 and id=$2::uuid
       returning id,purchase,purchased_at`,
      [listId, historicalId, JSON.stringify(patch)],
    );
    if (!result.rowCount)
      throw new DataError("El producto no existe en esta lista", 404);
    const listRecord = await db.query("select name from lists where id=$1", [
      listId,
    ]);
    return {
      id: result.rows[0].id as string,
      listId,
      listName: listRecord.rows[0]?.name as string,
      canEdit: true,
      purchase: result.rows[0].purchase as Record<
        string,
        string | number | null
      >,
      purchasedAt: (result.rows[0].purchased_at as Date).toISOString(),
    };
  }, scope, { allowCompleted: true });
}

export async function repeatPurchase(
  groupKey: string,
  historicalIds: unknown,
  scope?: string,
): Promise<{ id: string; slug: string; name: string; count: number }> {
  if (
    typeof groupKey !== "string" ||
    !groupKey.trim() ||
    groupKey.length > 300 ||
    !Array.isArray(historicalIds) ||
    historicalIds.length === 0 ||
    historicalIds.length > 500
  )
    throw new DataError("La compra seleccionada no es válida");
  const ids = historicalIds.map((id) => text(id));
  if (
    new Set(ids).size !== ids.length ||
    ids.some(
      (id) =>
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id,
        ),
    )
  )
    throw new DataError("La compra seleccionada no es válida");

  return withList(async (db, sourceList, email) => {
    const historical = await db.query(
      "select id,purchase,purchased_at from historical where list_id=$1 and id=any($2::uuid[]) order by purchased_at,id",
      [sourceList, ids],
    );
    if (historical.rowCount !== ids.length)
      throw new DataError("La compra ya no está disponible en esta lista", 404);

    const purchases = historical.rows.map((row) => ({
      purchase: row.purchase as Record<string, string | number | null>,
      purchasedAt: (row.purchased_at as Date).toISOString(),
    }));
    if (purchases.some((item) => purchaseHistoryGroupKey(item) !== groupKey))
      throw new DataError("Selecciona los productos de una sola compra");

    const sourceName = String(
      purchases[0].purchase.purchase_name ??
        purchases[0].purchase.list_name ??
        purchaseDate(purchases[0]),
    ).trim();
    const name = text(`Recompra: ${sourceName}`.slice(0, 200));
    const created = await db.query(
      "insert into lists(owner_email,name) values($1,$2) returning id,slug",
      [email, name],
    );
    const  listId = created.rows[0].id as string;
    await db.query(
      "insert into list_members(list_id,email,role) values($1,$2,'list_editor')",
      [ listId, email],
    );
    await db.query(
      "insert into user_preferences(email,list_id) values($1,$2) on conflict(email) do update set list_id=excluded.list_id",
      [email,  listId],
    );

    let fallbackCategoryId: string | undefined;
    let pharmacyCategoryId: string | undefined;
    let count = 0;
    for (const item of purchases) {
      const record = item.purchase;
      const productName = text(String(record.name ?? ""));
      const itemUnit = isUnit(record.unit) ? record.unit : "un";
      const requestedQuantity = Number(record.cantidad);
      const quantity =
        Number.isFinite(requestedQuantity) && requestedQuantity > 0
          ? requestedQuantity
          : 1;
      const catalogProductId =
        typeof record.id_product === "string" && record.id_product.trim()
          ? record.id_product.trim()
          : undefined;

      const catalogProduct = catalogProductId
        ? await db.query(
            `select p.id,p.unit,p.available_units,p.id_category,c.name as category_name
             from catalog_products p
             join catalog_categories c on c.id=p.id_category
             where p.id=$1 and not p.archived and not c.archived for share of p,c`,
            [catalogProductId],
          )
        : { rows: [], rowCount: 0 };

      if (
        catalogProduct.rowCount &&
        (catalogProduct.rows[0].available_units as string[]).includes(itemUnit) &&
        isUnitAllowedForCategory(itemUnit, catalogProduct.rows[0].category_name)
      ) {
        const productId = catalogProduct.rows[0].id as string;
        const inserted = await db.query(
          `insert into shopping_list(list_id,id_product,cantidad,medida,precio,comprado,unit)
           values($1,$2,$3,1,0,false,$4)
           on conflict(list_id,id_product) do update
             set cantidad=coalesce(shopping_list.cantidad,0)+excluded.cantidad
             where shopping_list.unit=excluded.unit
           returning id`,
          [ listId, productId, quantity, itemUnit],
        );
        if (!inserted.rowCount)
          throw new DataError(
            `No se pudo combinar ${productName}: la unidad no coincide`,
            409,
          );
        await db.query(
          "insert into list_selections(list_id,product_id,checked) values($1,$2,true) on conflict(list_id,product_id) do update set checked=true",
          [ listId, productId],
        );
      } else {
        const requestedCategoryId =
          typeof record.id_category === "string" && record.id_category.trim()
            ? record.id_category.trim()
            : undefined;
        let categoryId: string | undefined;
        let categoryName: string | undefined;
        if (requestedCategoryId) {
          const category = await db.query(
            "select id,name from catalog_categories where id=$1 and not archived",
            [requestedCategoryId],
          );
          categoryId = category.rows[0]?.id as string | undefined;
          categoryName = category.rows[0]?.name as string | undefined;
        }
        if (itemUnit === "comp" && categoryName !== "Farmacia") {
          pharmacyCategoryId ??= (
            await db.query(
              "select id from catalog_categories where lower(trim(name))='farmacia' and not archived order by id limit 1",
            )
          ).rows[0]?.id as string | undefined;
          categoryId = pharmacyCategoryId;
          categoryName = categoryId ? "Farmacia" : undefined;
        }
        if (!categoryId) {
          fallbackCategoryId ??= (
            await db.query(
              "select id from catalog_categories where not archived order by name,id limit 1",
            )
          ).rows[0]?.id as string | undefined;
          categoryId = fallbackCategoryId;
          categoryName = (
            await db.query(
              "select name from catalog_categories where id=$1",
              [categoryId],
            )
          ).rows[0]?.name as string | undefined;
        }
        if (!categoryId)
          throw new DataError(
            `No hay una categoría activa para volver a agregar ${productName}`,
            409,
          );

        if (!isUnitAllowedForCategory(itemUnit, categoryName ?? ""))
          throw new DataError(
            `No hay una categoría compatible para volver a agregar ${productName}`,
            409,
          );

        const existing = await db.query(
          `select id,unit,cantidad from shopping_list
           where list_id=$1 and id_product is null
             and provisional_category_id=$2
             and lower(trim(provisional_name))=lower(trim($3)) for update`,
          [ listId, categoryId, productName],
        );
        if (existing.rowCount) {
          const current = existing.rows[0];
          if (current.unit !== itemUnit)
            throw new DataError(
              `No se pudo combinar ${productName}: la unidad no coincide`,
              409,
            );
          await db.query(
            "update shopping_list set cantidad=coalesce(cantidad,0)+$3 where list_id=$1 and id=$2",
            [ listId, current.id, quantity],
          );
        } else {
          await db.query(
            `insert into shopping_list(
               list_id,id_product,cantidad,medida,precio,comprado,unit,
               provisional_name,provisional_category_id,provisional_created_by,
               provisional_available_units
             ) values($1,null,$2,1,0,false,$3,$4,$5,$6,$7)`,
            [
               listId,
              quantity,
              itemUnit,
              productName,
              categoryId,
              email,
              compatibleUnits(itemUnit),
            ],
          );
        }
      }
      count++;
    }

    return {
      id:  listId,
      slug: created.rows[0].slug as string,
      name,
      count,
    };
  }, scope, { allowCompleted: true });
}
