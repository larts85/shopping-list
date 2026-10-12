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
  requireAvailableUnit,
} from "../lib/purchaseValidation";
import { compatibleUnits, isUnit, type Unit } from "../lib/units";
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
      `select l.*,p.name,p.id_category,p.unit as product_unit,p.available_units from shopping_list l join catalog_products p on p.id=l.id_product where l.household_id=$1 order by p.name,l.id`,
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
      availableUnits: r.available_units,
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
      "select p.available_units from shopping_list l join catalog_products p on p.id=l.id_product where l.household_id=$1 and l.id=$2",
      [h, text(id)],
    );
    requireRow(product.rowCount);
    if (values.unit)
      requireAvailableUnit(values.unit, product.rows[0].available_units);
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
        "select l.comprado,p.available_units from shopping_list l join catalog_products p on p.id=l.id_product where l.household_id=$1 and l.id=$2",
        [h, p.id],
      );
      requireRow(product.rowCount);
      if (product.rows[0].comprado)
        throw new DataError(
          "Registra nuevamente la compra para cambiar sus cantidades",
        );
      if (p.unit)
        requireAvailableUnit(p.unit, product.rows[0].available_units);
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

export async function removeCartItems(target: {
  productId?: string;
  categoryId?: string;
}): Promise<void> {
  if (!target || Boolean(target.productId) === Boolean(target.categoryId))
    throw new DataError("Indica un artículo o una categoría");
  const id = text(target.productId ?? target.categoryId);
  await withListItemEditor(async (db, h) => {
    // Remove only cart rows and their local selections, never global catalog rows.
    const removed = await db.query(
      `delete from shopping_list l where l.household_id=$1 and ${target.productId ? "l.id=$2" : "l.id_product in (select id from catalog_products where id_category=$2)"} returning id_product`,
      [h, id],
    );
    requireRow(removed.rowCount);
    await db.query(
      "delete from list_selections where household_id=$1 and product_id=any($2::text[])",
      [h, removed.rows.map((row) => row.id_product)],
    );
  });
}

export async function unmarkCartItem(id: string): Promise<void> {
  const productId = text(id);
  await withListItemEditor(async (db, h) => {
    requireRow(
      (
        await db.query(
          "update shopping_list set comprado=false where household_id=$1 and id=$2",
          [h, productId],
        )
      ).rowCount,
    );
  });
}

export interface BulkAddItem {
  name: string;
  idCategory: string;
  cantidad?: number;
  unit?: Unit;
}

export async function bulkAddToList(
  items: BulkAddItem[],
  scope?: string,
): Promise<{ added: number }> {
  if (!Array.isArray(items) || items.length === 0 || items.length > 500) {
    throw new DataError("Listado de artículos inválido");
  }

  return withListItemEditor(async (db, h) => {
    await db.query(
      "select pg_advisory_xact_lock(hashtextextended('global_catalog', 2))",
    );

    let addedCount = 0;

    for (const item of items) {
      if (!item || typeof item !== "object") {
        throw new DataError("Artículo inválido");
      }
      const name = text(item.name);
      const idCategory = text(item.idCategory);
      const cantidad = item.cantidad ? positive(item.cantidad, false) : 1;
      const requestedUnit: Unit =
        item.unit && isUnit(item.unit) ? item.unit : "un";

      const catCheck = await db.query(
        "select name from catalog_categories where id=$1 and not archived",
        [idCategory],
      );
      requireRow(catCheck.rowCount);

      let productId: string;
      const existing = await db.query(
        "select id, unit, available_units from catalog_products where lower(trim(name)) = lower(trim($1)) and not archived order by id limit 1",
        [name],
      );

      let unit = requestedUnit;
      if (existing.rowCount && existing.rows[0]) {
        productId = existing.rows[0].id;
        if (!existing.rows[0].available_units.includes(requestedUnit))
          unit = existing.rows[0].unit;
      } else {
        const availableUnits = compatibleUnits(requestedUnit);
        const inserted = await db.query(
          "insert into catalog_products(name, id_category, unit, available_units) values($1, $2, $3, $4) returning id",
          [name, idCategory, requestedUnit, availableUnits],
        );
        productId = inserted.rows[0].id;
      }

      await db.query(
        "insert into list_selections(household_id, product_id, checked) values($1, $2, true) on conflict(household_id, product_id) do update set checked = true",
        [h, productId],
      );

      await db.query(
        `insert into shopping_list(household_id, id_product, cantidad, medida, unit)
         values($1, $2, $3, 1, $4)
         on conflict(household_id, id_product)
         do update set
           cantidad = case
             when shopping_list.comprado then shopping_list.cantidad
             else coalesce(excluded.cantidad, shopping_list.cantidad)
           end`,
        [h, productId, cantidad, unit],
      );

      addedCount++;
    }

    return { added: addedCount };
  }, scope);
}

