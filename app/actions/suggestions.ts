"use server";
import {
  withHousehold,
  withListItemEditor,
  withListEditor,
  canManageHousehold,
  householdRole,
  text,
  positive,
  requireRow,
  DataError,
} from "../lib/database";
import {
  quantityForUnit,
  requireAvailableUnit,
} from "../lib/purchaseValidation";
import { isUnit, type Unit } from "../lib/units";
export interface SuggestionInput {
  kind: "add" | "quantity" | "remove";
  productId: string;
  quantity?: number;
  unit?: Unit;
  note?: string;
}
export interface ListSuggestion {
  id: string;
  email: string;
  kind: SuggestionInput["kind"];
  product_id: string;
  name: string;
  quantity: number | null;
  unit: Unit | null;
  note: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_by: string | null;
}
export async function submitSuggestion(
  input: SuggestionInput,
  scope?: string,
): Promise<void> {
  if (!input || !["add", "quantity", "remove"].includes(input.kind))
    throw new DataError("Sugerencia inválida");
  const productId = text(input.productId),
    note = input.note?.trim() || "";
  if (note.length > 200) throw new DataError("Nota demasiado larga");
  const quantity = input.kind === "remove" ? null : positive(input.quantity);
  if (input.kind !== "remove" && !isUnit(input.unit))
    throw new DataError("Unidad inválida");
  await withListItemEditor(async (db, h, email) => {
    const product = await db.query(
      "select available_units from catalog_products where id=$1 and not archived",
      [productId],
    );
    requireRow(product.rowCount);
    if (input.kind !== "remove")
      requireAvailableUnit(input.unit!, product.rows[0].available_units);
    const validatedQuantity =
      input.kind === "remove" ? null : quantityForUnit(quantity, input.unit);
    if (input.kind !== "add")
      requireRow(
        (
          await db.query(
            "select 1 from shopping_list where household_id=$1 and id_product=$2 and not comprado",
            [h, productId],
          )
        ).rowCount,
      );
    await db.query(
      "insert into list_suggestions(household_id,email,kind,product_id,quantity,unit,note) values($1,$2,$3,$4,$5,$6,$7)",
      [
        h,
        email,
        input.kind,
        productId,
        validatedQuantity,
        input.kind === "remove" ? null : input.unit,
        note,
      ],
    );
  }, scope);
}
export async function getSuggestions(
  scope?: string,
): Promise<ListSuggestion[]> {
  return withHousehold(async (db, h, email) => {
    const canReviewAll = canManageHousehold(await householdRole(db, h, email));
    return (
      await db.query(
        "select s.id,s.email,s.kind,s.product_id,p.name,s.quantity,s.unit,s.note,s.status,s.created_at,s.reviewed_by from list_suggestions s join catalog_products p on p.id=s.product_id where s.household_id=$1 and ($2 or s.email=$3) order by s.created_at desc,s.id desc limit 100",
        [h, canReviewAll, email],
      )
    ).rows.map((r) => ({
      ...r,
      quantity: r.quantity === null ? null : Number(r.quantity),
      created_at: r.created_at.toISOString(),
    }));
  }, scope);
}
export async function reviewSuggestion(
  id: string,
  decision: "approve" | "reject",
  scope?: string,
): Promise<void> {
  if (!["approve", "reject"].includes(decision))
    throw new DataError("Decisión inválida");
  await withListEditor(async (db, h, email) => {
    const result = await db.query(
      "select s.*,p.available_units as product_available_units from list_suggestions s join catalog_products p on p.id=s.product_id where s.household_id=$1 and s.id::text=$2 for update of s",
      [h, text(id)],
    );
    requireRow(result.rowCount);
    const s = result.rows[0];
    if (s.status !== "pending")
      throw new DataError("La sugerencia ya fue revisada");
    if (decision === "approve") {
      requireRow(
        (
          await db.query(
            "select 1 from household_members where household_id=$1 and email=$2",
            [h, s.email],
          )
        ).rowCount,
      );
      if (s.kind !== "remove")
        requireAvailableUnit(s.unit, s.product_available_units);
      if (s.kind === "add") {
        if (
          (
            await db.query(
              "select 1 from shopping_list where household_id=$1 and id_product=$2",
              [h, s.product_id],
            )
          ).rowCount
        )
          throw new DataError(
            "El producto ya está en la lista; revisa la sugerencia",
          );
        await db.query(
          "insert into shopping_list(household_id,id_product,cantidad,medida,unit) values($1,$2,$3,1,$4)",
          [h, s.product_id, positive(s.quantity), s.unit],
        );
      } else if (s.kind === "quantity")
        requireRow(
          (
            await db.query(
              "update shopping_list set cantidad=$3,medida=1,unit=$4 where household_id=$1 and id_product=$2 and not comprado",
              [h, s.product_id, positive(s.quantity), s.unit],
            )
          ).rowCount,
        );
      else
        requireRow(
          (
            await db.query(
              "delete from shopping_list where household_id=$1 and id_product=$2 and not comprado",
              [h, s.product_id],
            )
          ).rowCount,
        );
      if (s.kind === "add" || s.kind === "remove")
        await db.query(
          "insert into list_selections(household_id,product_id,checked) values($1,$2,$3) on conflict(household_id,product_id) do update set checked=excluded.checked",
          [h, s.product_id, s.kind === "add"],
        );
    }
    await db.query(
      "update list_suggestions set status=$3,reviewed_at=now(),reviewed_by=$4 where household_id=$1 and id=$2",
      [h, s.id, decision === "approve" ? "approved" : "rejected", email],
    );
  }, scope);
}
