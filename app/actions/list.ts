"use server";
import {
  withList,
  withListItemEditor,
  withListEditor,
  canManageList,
  canEditList,
  text,
  positive,
  requireRow,
  DataError,
  listRole,
  type MemberRole,
} from "../lib/database";
import {
  purchaseValues,
  quantityForUnit,
  requireAvailableUnit,
} from "../lib/purchaseValidation";
import {
  compatibleUnits,
  isUnit,
  isUnitAllowedForCategory,
  isValidAvailableUnits,
  unitsForCategory,
  type Unit,
} from "../lib/units";
import type { Category, IList } from "../lib/types";
export async function addList(): Promise<void> {
  await withListItemEditor(async (db, h) => {
    await db.query(
      "insert into shopping_list(list_id,id_product,unit) select $1,p.id,p.unit from catalog_products p join list_selections s on s.product_id=p.id where s.list_id=$1 and s.checked and not p.archived on conflict(list_id,id_product) do nothing",
      [h],
    );
  });
}
export async function getList(scope?: string): Promise<IList[]> {
  return withList(async (db, h) => {
    const { rows } = await db.query(
      `select l.*,coalesce(p.name,l.provisional_name) name,
        coalesce(p.id_category,l.provisional_category_id) id_category,
        c.name as category_name,
        p.unit as product_unit,p.urgent_purchase,
        coalesce(p.available_units,l.provisional_available_units) available_units,
        l.id_product is null is_provisional,l.provisional_created_by,
        cr.email catalog_request_email,cr.status catalog_request_status
       from shopping_list l
       left join catalog_products p on p.id=l.id_product
       left join catalog_categories c on c.id=coalesce(p.id_category,l.provisional_category_id)
       left join catalog_requests cr on cr.id=l.catalog_request_id
       where l.list_id=$1 order by name,l.id`,
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
      precioTotalValue: r.precio_total == null ? null : Number(r.precio_total),
      discountType: r.discount_type ?? null,
      discountValue: r.discount_value == null ? null : Number(r.discount_value),
      precioTotal:
        r.precio_total == null && (r.precio == null || r.cantidad == null)
          ? ""
          : currency(
              r.precio_total == null
                ? Number(r.precio) * Number(r.cantidad)
                : Number(r.precio_total),
            ),
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
      urgentPurchase: r.urgent_purchase ?? false,
      availableUnits: unitsForCategory(r.category_name ?? ""),
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
  precioMode: "unit" | "total" = "unit",
  description?: unknown,
): Promise<void> {
  const values = purchaseValues(cantidad, medida, unit);
  if (precioMode !== "unit" && precioMode !== "total")
    throw new DataError("Modo de precio inválido");
  const enteredPrice = precio == null ? null : positive(precio, true);
  const hasDescription = description !== undefined;
  if (hasDescription && typeof description !== "string")
    throw new DataError("Descripción inválida");
  const validDescription =
    typeof description === "string" ? description.trim() : null;
  if (validDescription !== null && validDescription.length > 500)
    throw new DataError("La descripción no puede superar los 500 caracteres");
  await withListItemEditor(async (db, h) => {
    const product = await db.query(
      `select c.name as category_name,coalesce(l.unit,p.unit) as current_unit
       from shopping_list l
       left join catalog_products p on p.id=l.id_product
       left join catalog_categories c on c.id=coalesce(p.id_category,l.provisional_category_id)
       where l.list_id=$1 and l.id=$2`,
      [h, text(id)],
    );
    requireRow(product.rowCount);
    if (
      values.unit &&
      !isUnitAllowedForCategory(values.unit, product.rows[0].category_name ?? "")
    )
      throw new DataError("La unidad no está disponible para esta categoría");
    values.cantidad = quantityForUnit(
      cantidad,
      values.unit ?? product.rows[0].current_unit,
    );
    requireRow(
      (
        await db.query(
          `update shopping_list set cantidad=$3,medida=$4,
             precio=case when $5::numeric is null then null when $7::text='total' then $5::numeric/$3::numeric else $5::numeric end,
             precio_total=case when $5::numeric is null then null when $7::text='total' then $5::numeric else $3::numeric*$5::numeric end,
             comprado=true,unit=coalesce($6,unit),
             description=case when $8::boolean then $9::text else description end,
             provisional_available_units=case when id_product is null and $6::text is not null
               then array[$6::text] else provisional_available_units end
           where list_id=$1 and id=$2`,
          [
            h,
            text(id),
            values.cantidad,
            values.medida,
            enteredPrice,
            values.unit ?? null,
            precioMode,
            hasDescription,
            validDescription,
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
    urgentPurchase?: unknown;
    precio_total?: unknown;
    discount_type?: unknown;
    discount_value?: unknown;
  },
): Promise<void> {
  const rowId = text(id);
  if (typeof input.description !== "string")
    throw new DataError("Descripción inválida");
  const description = input.description.trim();
  if (description.length > 500) throw new DataError("Descripción demasiado larga");
  const hasUrgentPurchase = Object.hasOwn(input, "urgentPurchase");
  if (hasUrgentPurchase && typeof input.urgentPurchase !== "boolean")
    throw new DataError("Prioridad de compra inválida");

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
  const hasTotal = Object.hasOwn(input, "precio_total");
  const total = !hasTotal || input.precio_total === null || input.precio_total === ""
    ? null
    : positive(input.precio_total, true);
  const hasDiscount = Object.hasOwn(input, "discount_type") || Object.hasOwn(input, "discount_value");
  const discountType = input.discount_type == null || input.discount_type === ""
    ? null
    : input.discount_type;
  const discountValue = discountType === null
    ? null
    : positive(input.discount_value, true);
  if (discountType !== null && discountType !== "percent" && discountType !== "amount")
    throw new DataError("Tipo de descuento inválido");
  if (discountType === "percent" && discountValue! > 100)
    throw new DataError("El descuento porcentual debe estar entre 0 y 100");

  await withListItemEditor(async (db, h, email) => {
    const product = await db.query(
      "select l.comprado,l.cantidad,l.precio,l.unit,l.id_product,p.unit product_unit,coalesce(p.available_units,l.provisional_available_units) available_units from shopping_list l left join catalog_products p on p.id=l.id_product where l.list_id=$1 and l.id=$2 for update of l",
      [h, rowId],
    );
    requireRow(product.rowCount);
    if (hasUrgentPurchase) {
      if (!product.rows[0].id_product)
        throw new DataError(
          "Los productos provisionales no admiten prioridad de compra",
        );
      requireRow(
        (
          await db.query(
            "update catalog_products set urgent_purchase=$2 where id=$1 and not archived",
            [product.rows[0].id_product, input.urgentPurchase],
          )
        ).rowCount,
      );
    }
    const bought = product.rows[0].comprado;
    const editingPurchase = hasCantidad || hasUnit || hasPrice || hasTotal || hasDiscount;
    if (
      bought &&
      editingPurchase &&
      !canManageList(await listRole(db, h, email))
    )
      throw new DataError("Solo el propietario puede editar los datos de compra", 403);
    if (bought && hasCantidad && cantidad === null)
      throw new DataError("La cantidad comprada debe ser mayor que cero");
    const currentUnit = product.rows[0].unit ?? product.rows[0].product_unit;
    if (hasCantidad && cantidad !== null)
      quantityForUnit(cantidad, hasUnit ? unit! : currentUnit);
    const quantityChanged =
      hasCantidad && Number(cantidad) !== Number(product.rows[0].cantidad);
    const unitChanged = hasUnit && unit !== currentUnit;
    const priceChanged =
      hasPrice && !hasTotal &&
      (price === null
        ? product.rows[0].precio !== null
        : product.rows[0].precio === null ||
          Number(price) !== Number(product.rows[0].precio));
    const recalculateTotal = bought && !hasTotal && (quantityChanged || unitChanged || priceChanged);
    const effectiveQuantity = hasCantidad ? cantidad : Number(product.rows[0].cantidad);
    const effectivePrice = hasTotal
      ? total === null ? null : total / effectiveQuantity
      : hasPrice ? price : product.rows[0].precio == null ? null : Number(product.rows[0].precio);
    if (hasUnit && unit !== currentUnit)
      requireAvailableUnit(unit!, product.rows[0].available_units);
    if ((hasPrice || hasTotal) && !bought)
      throw new DataError("El precio se registra al marcar el producto como comprado");

    requireRow(
      (
        await db.query(
          `update shopping_list set description=$3,
             cantidad=case when $4 then $5 else cantidad end,
             unit=case when $6 then $7 else unit end,
             precio=case when $8 or $10 then $11 else precio end,
             precio_total=case when $10 then $12
               when $13 then $14 else precio_total end,
             discount_type=case when $15 then $16 else discount_type end,
             discount_value=case when $15 then $17 else discount_value end
           where list_id=$1 and id=$2`,
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
            hasTotal,
            effectivePrice,
            hasTotal,
            total,
            recalculateTotal,
            effectivePrice === null ? null : effectiveQuantity * effectivePrice,
            hasDiscount,
            discountType,
            discountValue,
          ],
        )
      ).rowCount,
    );
  });
}

export async function setListDiscount(input: {
  type: unknown;
  value: unknown;
}): Promise<{ type: "percent" | "amount" | null; value: number | null }> {
  const type = input?.type == null || input.type === "" ? null : input.type;
  const value = type === null ? null : positive(input.value, true);
  if (type !== null && type !== "percent" && type !== "amount")
    throw new DataError("Tipo de descuento inválido");
  if (type === "percent" && value! > 100)
    throw new DataError("El descuento porcentual debe estar entre 0 y 100");
  return withListEditor(async (db, listId) => {
    await db.query(
      "update lists set discount_type=$2,discount_value=$3 where id=$1",
      [listId, type, value],
    );
    return { type: type as "percent" | "amount" | null, value };
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
export async function getListPageData(scope?: string): Promise<{
  activeList: { id: string; name: string; discountType: "percent" | "amount" | null; discountValue: number | null };
  canEditList: boolean;
  canManageList: boolean;
  list: Record<string, IList[]>;
  categories: Category[];
}> {
  return withList(async (db, listId, email) => {
    const [itemRows, categoryRows, listMetaRows] = await Promise.all([
      db.query(
        `select l.*,coalesce(p.name,l.provisional_name) name,
          coalesce(p.id_category,l.provisional_category_id) id_category,
          c.name as category_name,p.unit as product_unit,p.urgent_purchase,
          coalesce(p.available_units,l.provisional_available_units) available_units,
          l.id_product is null is_provisional,l.provisional_created_by,
          cr.email catalog_request_email,cr.status catalog_request_status
         from shopping_list l
         left join catalog_products p on p.id=l.id_product
         left join catalog_categories c on c.id=coalesce(p.id_category,l.provisional_category_id)
         left join catalog_requests cr on cr.id=l.catalog_request_id
         where l.list_id=$1 order by name,l.id`,
        [listId],
      ),
      db.query(
        "select id,name from catalog_categories where not archived order by name,id",
      ),
      db.query(
        `select h.id,h.name,h.discount_type,h.discount_value,h.owner_email=$2 as can_manage,
          case when h.owner_email=$2 then 'owner' else m.role end as member_role
         from lists h join list_members m on m.list_id=h.id and m.email=$2
         where h.id=$1`,
        [listId, email],
      ),
    ]);
    const currency = (n: number) =>
      new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(n);
    const grouped = itemRows.rows.map((r) => ({
      id: r.id,
      id_product: r.id_product,
      name: r.name,
      description: r.description ?? "",
      id_category: r.id_category,
      cantidad: r.cantidad ?? "",
      medida: r.medida ?? "",
      precio: r.precio == null ? "" : currency(Number(r.precio)),
      precioValue: r.precio == null ? null : Number(r.precio),
      precioTotalValue: r.precio_total == null ? null : Number(r.precio_total),
      discountType: r.discount_type ?? null,
      discountValue: r.discount_value == null ? null : Number(r.discount_value),
      precioTotal:
        r.precio_total == null && (r.precio == null || r.cantidad == null)
          ? ""
          : currency(
              r.precio_total == null
                ? Number(r.precio) * Number(r.cantidad)
                : Number(r.precio_total),
            ),
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
      urgentPurchase: r.urgent_purchase ?? false,
      availableUnits: unitsForCategory(r.category_name ?? ""),
      isProvisional: r.is_provisional,
      createdBy: r.provisional_created_by,
      catalogRequestEmail: r.catalog_request_email,
      catalogRequestStatus: r.catalog_request_status,
    }));
    return {
      activeList: {
        id: listMetaRows.rows[0].id,
        name: listMetaRows.rows[0].name,
        discountType: listMetaRows.rows[0].discount_type,
        discountValue: listMetaRows.rows[0].discount_value == null ? null : Number(listMetaRows.rows[0].discount_value),
      },
      canEditList: canEditList(
        listMetaRows.rows[0].member_role as MemberRole,
      ),
      canManageList: listMetaRows.rows[0].can_manage,
      list: grouped.reduce(
        (a, product) => {
          (a[product.id_category] ||= []).push(product);
          return a;
        },
        {} as Record<string, IList[]>,
      ),
      categories: categoryRows.rows as Category[],
    };
  }, scope);
}
export async function shoppingList(): Promise<IList[]> {
  return (await getList()).filter((p) => p.comprado === "1");
}
export async function deleteShoppingList(): Promise<void> {
  await withListEditor(async (db, h) => {
    await db.query(
      "delete from shopping_list where list_id=$1 and comprado",
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
        `select l.comprado,c.name as category_name,coalesce(l.unit,p.unit) as current_unit
         from shopping_list l
         left join catalog_products p on p.id=l.id_product
         left join catalog_categories c on c.id=coalesce(p.id_category,l.provisional_category_id)
         where l.list_id=$1 and l.id=$2`,
        [h, p.id],
      );
      requireRow(product.rowCount);
      if (product.rows[0].comprado)
        throw new DataError(
          "Registra nuevamente la compra para cambiar sus cantidades",
        );
      if (
        p.unit &&
        !isUnitAllowedForCategory(p.unit, product.rows[0].category_name ?? "")
      )
        throw new DataError("La unidad no está disponible para esta categoría");
      quantityForUnit(p.cantidad, p.unit ?? product.rows[0].current_unit);
      requireRow(
        (
          await db.query(
            `update shopping_list set cantidad=$3,medida=$4,unit=coalesce($5,unit),
               provisional_available_units=case when id_product is null and $5::text is not null
                 then array[$5::text] else provisional_available_units end
             where list_id=$1 and id=$2`,
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
      `delete from shopping_list l where l.list_id=$1 and ${target.productId ? "l.id=$2" : "(l.id_product in (select id from catalog_products where id_category=$2) or l.provisional_category_id=$2)"} returning id_product`,
      [h, id],
    );
    requireRow(removed.rowCount);
    await db.query(
      "delete from list_selections where list_id=$1 and product_id=any($2::text[])",
      [h, removed.rows.map((row) => row.id_product)],
    );
  });
}

export async function bulkUpdateCartItems(input: {
  ids: unknown;
  action: unknown;
  description?: unknown;
  urgentPurchase?: unknown;
}): Promise<void> {
  if (!input || !Array.isArray(input.ids) || input.ids.length < 1 || input.ids.length > 500)
    throw new DataError("Selecciona al menos un artículo");
  const ids = input.ids.map(text);
  const action = input.action;
  if (!["remove", "buy", "description", "urgent"].includes(String(action)))
    throw new DataError("Acción masiva inválida");
  if (action === "description" && (typeof input.description !== "string" || input.description.trim().length > 500))
    throw new DataError("La descripción no puede superar los 500 caracteres");
  if (action === "urgent" && typeof input.urgentPurchase !== "boolean")
    throw new DataError("Prioridad de compra inválida");
  await withListItemEditor(async (db, h) => {
    const rows = await db.query("select id,id_product,comprado from shopping_list where list_id=$1 and id=any($2::text[]) for update", [h, ids]);
    if (rows.rowCount !== ids.length) throw new DataError("Uno o más artículos ya no están disponibles");
    if (action === "remove") {
      await db.query("delete from shopping_list where list_id=$1 and id=any($2::text[])", [h, ids]);
    } else if (action === "buy") {
      await db.query("update shopping_list set comprado=true where list_id=$1 and id=any($2::text[])", [h, ids]);
    } else if (action === "description") {
      await db.query("update shopping_list set description=$3 where list_id=$1 and id=any($2::text[])", [h, ids, String(input.description).trim()]);
    } else {
      if (rows.rows.some((row) => !row.id_product))
        throw new DataError(
          "La compra urgente solo está disponible para productos del catálogo",
        );
      const productIds = [...new Set(rows.rows.map((row) => row.id_product))];
      const updated = await db.query(
        "update catalog_products set urgent_purchase=$2 where id=any($1::text[]) and not archived returning id",
        [productIds, input.urgentPurchase],
      );
      if (updated.rowCount !== productIds.length)
        throw new DataError("Uno o más productos ya no están disponibles");
    }
  });
}

export async function getMoveTargets(scope?: string) {
  return withList(async (db, source, email) => {
    const { rows } = await db.query(
      "select h.id,h.name from lists h join list_members m on m.list_id=h.id where m.email=$1 and h.id<>$2 and h.status='active' order by h.name,h.id",
      [email, source],
    );
    return rows as { id: string; name: string }[];
  }, scope);
}

export async function moveCartItems(input: {
  targetListId: string;
  itemId?: string;
  itemIds?: string[];
  /** @deprecated Older clients use productId for the shopping_list row ID. */
  productId?: string;
  categoryId?: string;
}): Promise<{ moved: number; merged: number }> {
  const itemIdValue = input?.itemId ?? input?.productId;
  const itemIds = input?.itemIds?.map(text);
  if (
    !input ||
    (!itemIds?.length && Boolean(itemIdValue) === Boolean(input.categoryId)) ||
    (input.itemId && input.productId)
  )
    throw new DataError("Indica un artículo o una categoría");
  const targetId = text(input.targetListId).toLowerCase();
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
      "select 1 from list_members m join lists h on h.id=m.list_id where m.list_id=$1 and m.email=$2 and h.status='active' for update of m",
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
       where l.list_id=$1 and ${itemIds?.length ? "l.id=any($2::text[])" : sourceItemId ? "l.id=$2 and not l.comprado" : "coalesce(p.id_category,l.provisional_category_id)=$2"}
       order by l.id for update of l`,
      [source, itemIds?.length ? itemIds : sourceItemId ?? sourceCategoryId],
    );
    requireRow(rows.rowCount);
    if (rows.rows.some((row) => row.comprado))
      throw new DataError("Desmarca los artículos comprados antes de moverlos");

    let merged = 0;
    for (const row of rows.rows) {
      const existing = row.id_product
        ? await db.query(
            "select id,cantidad,unit,comprado from shopping_list where list_id=$1 and id_product=$2 for update",
            [targetId, row.id_product],
          )
        : await db.query(
            `select id,cantidad,unit,comprado from shopping_list
             where list_id=$1 and id_product is null and provisional_category_id=$2
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
          "update shopping_list set cantidad=$3 where list_id=$1 and id=$2",
          [targetId, target.id, Number(target.cantidad ?? 0) + Number(row.cantidad ?? 0)],
        );
        merged++;
      } else {
        await db.query(
          `insert into shopping_list(list_id,id_product,cantidad,medida,precio,comprado,unit,
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
      "delete from shopping_list where list_id=$1 and id=any($2::text[])",
      [source, rows.rows.map((row) => row.id)],
    );
    const productIds = rows.rows
      .map((row) => row.id_product)
      .filter((id): id is string => id !== null);
    if (productIds.length) {
      await db.query(
        "delete from list_selections where list_id=$1 and product_id=any($2::text[])",
        [source, productIds],
      );
      await db.query(
        "insert into list_selections(list_id,product_id,checked) select $1,product_id,true from unnest($2::text[]) product_id on conflict(list_id,product_id) do update set checked=true",
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
          "update shopping_list set comprado=false where list_id=$1 and id=$2",
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
      const requestedUnit: Unit =
        item.unit && isUnit(item.unit) ? item.unit : "un";
      const cantidad =
        item.cantidad === undefined
          ? 1
          : quantityForUnit(item.cantidad, requestedUnit);
      const requestedAvailableUnits =
        item.availableUnits ?? compatibleUnits(requestedUnit);
      if (!isValidAvailableUnits(requestedAvailableUnits, requestedUnit))
        throw new DataError("Unidades disponibles inválidas");

      const catCheck = await db.query(
        "select name from catalog_categories where id=$1 and not archived",
        [idCategory],
      );
      requireRow(catCheck.rowCount);
      if (
        requestedAvailableUnits.some(
          (unit) => !isUnitAllowedForCategory(unit, catCheck.rows[0].name),
        )
      )
        throw new DataError("Los comprimidos solo están disponibles en Farmacia");

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
          "insert into list_selections(list_id, product_id, checked) values($1, $2, true) on conflict(list_id, product_id) do update set checked = true",
          [h, productId],
        );
        await db.query(
          `insert into shopping_list(list_id,id_product,cantidad,medida,unit)
           values($1,$2,$3,1,$4) on conflict(list_id,id_product)
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
          "select id,provisional_available_units from shopping_list where list_id=$1 and id_product is null and provisional_category_id=$2 and lower(trim(provisional_name))=lower(trim($3)) for update",
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
             where list_id=$1 and id=$2`,
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
            `insert into shopping_list(list_id,id_product,cantidad,medida,unit,
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
