"use server";
import {
  withHousehold,
  withListItemEditor,
  withListEditor,
  text,
  positive,
  requireRow,
  DataError,
  householdRole,
} from "../lib/database";
import {
  purchaseValues,
  requireAvailableUnit,
} from "../lib/purchaseValidation";
import {
  compatibleUnits,
  isUnit,
  isValidAvailableUnits,
  type Unit,
} from "../lib/units";
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
      `select l.*,coalesce(p.name,l.provisional_name) name,
        coalesce(p.id_category,l.provisional_category_id) id_category,
        p.unit as product_unit,
        coalesce(p.available_units,l.provisional_available_units) available_units,
        l.id_product is null is_provisional,l.provisional_created_by,
        cr.email catalog_request_email,cr.status catalog_request_status
       from shopping_list l
       left join catalog_products p on p.id=l.id_product
       left join catalog_requests cr on cr.id=l.catalog_request_id
       where l.household_id=$1 order by name,l.id`,
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
      description: r.description ?? "",
      id_category: r.id_category,
      cantidad: r.cantidad ?? "",
      medida: r.medida ?? "",
      precio: r.precio == null ? "" : currency(Number(r.precio)),
      precioValue: r.precio == null ? null : Number(r.precio),
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
      productUnit: r.product_unit ?? r.unit ?? "un",
      availableUnits: r.available_units,
      isProvisional: r.is_provisional,
      createdBy: r.provisional_created_by,
      catalogRequestEmail: r.catalog_request_email,
      catalogRequestStatus: r.catalog_request_status,
    }));
  }, scope);
}
export async function setBought(
  id: string,
  cantidad: number,
  medida: number,
  precio: number | null,
  unit?: Unit,
): Promise<void> {
  const values = purchaseValues(cantidad, medida, unit);
  const price = precio == null ? null : positive(precio, true);
  await withListItemEditor(async (db, h) => {
    const product = await db.query(
      "select coalesce(p.available_units,l.provisional_available_units) available_units from shopping_list l left join catalog_products p on p.id=l.id_product where l.household_id=$1 and l.id=$2",
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

export async function updateListItemDetails(
  id: unknown,
  input: {
    description: unknown;
    cantidad?: unknown;
    unit?: unknown;
    precio?: unknown;
  },
): Promise<void> {
  const rowId = text(id);
  if (typeof input.description !== "string")
    throw new DataError("Descripción inválida");
  const description = input.description.trim();
  if (description.length > 500) throw new DataError("Descripción demasiado larga");

  const hasCantidad = Object.hasOwn(input, "cantidad");
  const cantidad =
    !hasCantidad || input.cantidad === null || input.cantidad === ""
      ? null
      : positive(input.cantidad);
  const hasUnit = Object.hasOwn(input, "unit");
  if (hasUnit && !isUnit(input.unit)) throw new DataError("Unidad inválida");
  const unit = hasUnit ? (input.unit as Unit) : null;
  const hasPrice = Object.hasOwn(input, "precio");
  const price =
    !hasPrice || input.precio === null || input.precio === ""
      ? null
      : positive(input.precio, true);

  await withListItemEditor(async (db, h, email) => {
    const product = await db.query(
      "select l.comprado,l.unit,p.unit product_unit,coalesce(p.available_units,l.provisional_available_units) available_units from shopping_list l left join catalog_products p on p.id=l.id_product where l.household_id=$1 and l.id=$2 for update of l",
      [h, rowId],
    );
    requireRow(product.rowCount);
    const bought = product.rows[0].comprado;
    const editingPurchase = hasCantidad || hasUnit || hasPrice;
    if (bought && editingPurchase && (await householdRole(db, h, email)) !== "owner")
      throw new DataError("Solo el propietario puede editar los datos de compra", 403);
    if (bought && hasCantidad && cantidad === null)
      throw new DataError("La cantidad comprada debe ser mayor que cero");
    const currentUnit = product.rows[0].unit ?? product.rows[0].product_unit;
    if (hasUnit && unit !== currentUnit)
      requireAvailableUnit(unit!, product.rows[0].available_units);
    if (hasPrice && !bought)
      throw new DataError("El precio se registra al marcar el producto como comprado");

    requireRow(
      (
        await db.query(
          `update shopping_list set description=$3,
             cantidad=case when $4 then $5 else cantidad end,
             unit=case when $6 then $7 else unit end,
             precio=case when $8 then $9 else precio end
           where household_id=$1 and id=$2`,
          [
            h,
            rowId,
            description,
            hasCantidad,
            cantidad,
            hasUnit,
            unit,
            hasPrice,
            price,
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
        "select l.comprado,coalesce(p.available_units,l.provisional_available_units) available_units from shopping_list l left join catalog_products p on p.id=l.id_product where l.household_id=$1 and l.id=$2",
        [h, p.id],
      );
      requireRow(product.rowCount);
      if (product.rows[0].comprado)
        throw new DataError(
          "Registra nuevamente la compra para cambiar sus cantidades",
        );
      if (p.unit) requireAvailableUnit(p.unit, product.rows[0].available_units);
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
      `delete from shopping_list l where l.household_id=$1 and ${target.productId ? "l.id=$2" : "(l.id_product in (select id from catalog_products where id_category=$2) or l.provisional_category_id=$2)"} returning id_product`,
      [h, id],
    );
    requireRow(removed.rowCount);
    await db.query(
      "delete from list_selections where household_id=$1 and product_id=any($2::text[])",
      [h, removed.rows.map((row) => row.id_product)],
    );
  });
}

export async function getMoveTargets(scope?: string) {
  return withHousehold(async (db, source, email) => {
    const { rows } = await db.query(
      "select h.id,h.name from households h join household_members m on m.household_id=h.id where m.email=$1 and h.id<>$2 order by h.name,h.id",
      [email, source],
    );
    return rows as { id: string; name: string }[];
  }, scope);
}

export async function moveCartItems(input: {
  targetHouseholdId: string;
  itemId?: string;
  /** @deprecated Older clients use productId for the shopping_list row ID. */
  productId?: string;
  categoryId?: string;
}): Promise<{ moved: number; merged: number }> {
  const itemIdValue = input?.itemId ?? input?.productId;
  if (
    !input ||
    Boolean(itemIdValue) === Boolean(input.categoryId) ||
    (input.itemId && input.productId)
  )
    throw new DataError("Indica un artículo o una categoría");
  const targetId = text(input.targetHouseholdId).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId))
    throw new DataError("Lista de destino inválida");
  const sourceItemId = itemIdValue ? text(itemIdValue) : undefined;
  const sourceCategoryId = input.categoryId ? text(input.categoryId) : undefined;

  return withListItemEditor(async (db, source, email) => {
    if (source === targetId) throw new DataError("Elige otra lista");
    await db.query(
      "select pg_advisory_xact_lock(hashtextextended(least($1,$2)||':'||greatest($1,$2), 3))",
      [source, targetId],
    );
    const targetAccess = await db.query(
      "select 1 from household_members where household_id=$1 and email=$2 for update",
      [targetId, email],
    );
    requireRow(targetAccess.rowCount);

    // IList.id is the shopping_list row ID; id_product is a different catalog ID.
    const rows = await db.query(
      `select l.id,l.id_product,l.provisional_name,l.provisional_category_id,
              l.provisional_created_by,l.provisional_available_units,l.catalog_request_id,
              l.cantidad,l.medida,l.precio,l.comprado,l.unit,
              coalesce(p.id_category,l.provisional_category_id) id_category
       from shopping_list l left join catalog_products p on p.id=l.id_product
       where l.household_id=$1 and ${sourceItemId ? "l.id=$2 and not l.comprado" : "coalesce(p.id_category,l.provisional_category_id)=$2"}
       order by l.id for update of l`,
      [source, sourceItemId ?? sourceCategoryId],
    );
    requireRow(rows.rowCount);
    if (rows.rows.some((row) => row.comprado))
      throw new DataError("Desmarca los artículos comprados antes de moverlos");

    let merged = 0;
    for (const row of rows.rows) {
      const existing = row.id_product
        ? await db.query(
            "select id,cantidad,unit,comprado from shopping_list where household_id=$1 and id_product=$2 for update",
            [targetId, row.id_product],
          )
        : await db.query(
            `select id,cantidad,unit,comprado from shopping_list
             where household_id=$1 and id_product is null and provisional_category_id=$2
               and lower(trim(provisional_name))=lower(trim($3)) for update`,
            [targetId, row.provisional_category_id, row.provisional_name],
          );
      if (existing.rowCount) {
        const target = existing.rows[0];
        if (target.comprado)
          throw new DataError("El destino ya tiene este artículo comprado");
        if (target.unit !== row.unit)
          throw new DataError("El artículo ya existe con otra unidad en el destino", 409);
        await db.query(
          "update shopping_list set cantidad=$3 where household_id=$1 and id=$2",
          [targetId, target.id, Number(target.cantidad ?? 0) + Number(row.cantidad ?? 0)],
        );
        merged++;
      } else {
        await db.query(
          `insert into shopping_list(household_id,id_product,cantidad,medida,precio,comprado,unit,
             provisional_name,provisional_category_id,provisional_created_by,
             provisional_available_units,catalog_request_id)
           values($1,$2,$3,$4,$5,false,$6,$7,$8,$9,$10,$11)`,
          [
            targetId,
            row.id_product,
            row.cantidad,
            row.medida,
            row.precio,
            row.unit,
            row.provisional_name,
            row.provisional_category_id,
            row.provisional_created_by,
            row.provisional_available_units,
            row.catalog_request_id,
          ],
        );
      }
    }
    await db.query(
      "delete from shopping_list where household_id=$1 and id=any($2::text[])",
      [source, rows.rows.map((row) => row.id)],
    );
    const productIds = rows.rows
      .map((row) => row.id_product)
      .filter((id): id is string => id !== null);
    if (productIds.length) {
      await db.query(
        "delete from list_selections where household_id=$1 and product_id=any($2::text[])",
        [source, productIds],
      );
      await db.query(
        "insert into list_selections(household_id,product_id,checked) select $1,product_id,true from unnest($2::text[]) product_id on conflict(household_id,product_id) do update set checked=true",
        [targetId, productIds],
      );
    }
    return { moved: rows.rowCount ?? 0, merged };
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
  availableUnits?: Unit[];
}

export async function bulkAddToList(
  items: BulkAddItem[],
  scope?: string,
): Promise<{ added: number; catalogRequests: number }> {
  if (!Array.isArray(items) || items.length === 0 || items.length > 500) {
    throw new DataError("Listado de artículos inválido");
  }

  return withListItemEditor(async (db, h, email) => {
    let addedCount = 0;
    let catalogRequestCount = 0;

    for (const item of items) {
      if (!item || typeof item !== "object") {
        throw new DataError("Artículo inválido");
      }
      const name = text(item.name);
      const idCategory = text(item.idCategory);
      const cantidad = item.cantidad ? positive(item.cantidad, false) : 1;
      const requestedUnit: Unit =
        item.unit && isUnit(item.unit) ? item.unit : "un";
      const requestedAvailableUnits =
        item.availableUnits ?? compatibleUnits(requestedUnit);
      if (!isValidAvailableUnits(requestedAvailableUnits, requestedUnit))
        throw new DataError("Unidades disponibles inválidas");

      const catCheck = await db.query(
        "select name from catalog_categories where id=$1 and not archived",
        [idCategory],
      );
      requireRow(catCheck.rowCount);

      let productId: string | undefined;
      const existing = await db.query(
        "select id, unit, available_units from catalog_products where lower(trim(name)) = lower(trim($1)) and id_category=$2 and not archived order by id limit 1",
        [name, idCategory],
      );

      if (existing.rowCount && existing.rows[0]) {
        const catalogUnits: Unit[] = existing.rows[0].available_units;
        const sameAvailableUnits =
          catalogUnits.length === requestedAvailableUnits.length &&
          catalogUnits.every((unit) => requestedAvailableUnits.includes(unit));
        if (sameAvailableUnits) {
          productId = existing.rows[0].id;
          requireAvailableUnit(requestedUnit, catalogUnits);
        }
      }

      if (productId) {
        await db.query(
          "insert into list_selections(household_id, product_id, checked) values($1, $2, true) on conflict(household_id, product_id) do update set checked = true",
          [h, productId],
        );
        await db.query(
          `insert into shopping_list(household_id,id_product,cantidad,medida,unit)
           values($1,$2,$3,1,$4) on conflict(household_id,id_product)
           do update set cantidad=case when shopping_list.comprado then shopping_list.cantidad else excluded.cantidad end`,
          [h, productId, cantidad, requestedUnit],
        );
      } else {
        let catalogRequestId: string | null = null;
        await db.query("savepoint optional_catalog_request");
        try {
          const request = await db.query(
            "select id from catalog_requests where kind='product' and status='pending' and lower(trim(name))=lower(trim($1)) and category_id=$2 and unit=$3 order by created_at,id limit 1",
            [name, idCategory, requestedUnit],
          );
          catalogRequestId = request.rows[0]?.id ?? null;
          if (!catalogRequestId) {
            catalogRequestId = (
              await db.query(
                "insert into catalog_requests(email,kind,name,category_id,unit,note) values($1,'product',$2,$3,$4,$5) returning id",
                [
                  email,
                  name,
                  idCategory,
                  requestedUnit,
                  "Producto agregado como provisional a una lista compartida",
                ],
              )
            ).rows[0].id;
          }
          if (catalogRequestId) catalogRequestCount++;
          await db.query("release savepoint optional_catalog_request");
        } catch {
          await db.query("rollback to savepoint optional_catalog_request");
          await db.query("release savepoint optional_catalog_request");
          catalogRequestId = null;
        }
        const provisional = await db.query(
          "select id,provisional_available_units from shopping_list where household_id=$1 and id_product is null and provisional_category_id=$2 and lower(trim(provisional_name))=lower(trim($3)) for update",
          [h, idCategory, name],
        );
        const availableUnits = [
          ...new Set([
            ...(provisional.rows[0]?.provisional_available_units ?? []),
            ...requestedAvailableUnits,
          ]),
        ];
        if (provisional.rowCount) {
          await db.query(
            `update shopping_list set
              cantidad=case when comprado then cantidad else $3 end,
              unit=case when comprado then unit else $4 end,
              provisional_available_units=$5,
              catalog_request_id=coalesce($6,catalog_request_id)
             where household_id=$1 and id=$2`,
            [
              h,
              provisional.rows[0].id,
              cantidad,
              requestedUnit,
              availableUnits,
              catalogRequestId,
            ],
          );
        } else {
          await db.query(
            `insert into shopping_list(household_id,id_product,cantidad,medida,unit,
              provisional_name,provisional_category_id,provisional_created_by,
              provisional_available_units,catalog_request_id)
             values($1,null,$2,1,$3,$4,$5,$6,$7,$8)`,
            [
              h,
              cantidad,
              requestedUnit,
              name,
              idCategory,
              email,
              requestedAvailableUnits,
              catalogRequestId,
            ],
          );
        }
      }

      addedCount++;
    }

    return { added: addedCount, catalogRequests: catalogRequestCount };
  }, scope);
}
