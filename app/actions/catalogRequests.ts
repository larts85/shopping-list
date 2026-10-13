"use server";
import {
  withCatalog,
  appRole,
  text,
  DataError,
  requireRow,
} from "../lib/database";
import {
  compatibleUnits,
  isUnit,
  isValidAvailableUnits,
  type Unit,
} from "../lib/units";
export interface CatalogRequestInput {
  kind: "category" | "product";
  name: string;
  categoryId?: string;
  unit?: Unit;
  note?: string;
}
export interface CatalogRequest {
  id: string;
  email: string;
  kind: "category" | "product";
  name: string;
  category_id: string | null;
  unit: Unit | null;
  note: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  result_id: string | null;
}
export async function submitCatalogRequest(
  input: CatalogRequestInput,
): Promise<void> {
  if (!input || !["category", "product"].includes(input.kind))
    throw new DataError("Solicitud inválida");
  const name = text(input.name),
    note = input.note?.trim() || "";
  if (note.length > 200) throw new DataError("Nota demasiado larga");
  if (input.kind === "product" && !isUnit(input.unit))
    throw new DataError("Unidad inválida");
  await withCatalog(async (db, email) => {
    const category = input.kind === "product" ? text(input.categoryId) : null;
    if (category)
      requireRow(
        (
          await db.query(
            "select 1 from catalog_categories where id=$1 and not archived",
            [category],
          )
        ).rowCount,
      );
    const created = await db.query(
      "insert into catalog_requests(email,kind,name,category_id,unit,note) values($1,$2,$3,$4,$5,$6) returning id",
      [
        email,
        input.kind,
        name,
        category,
        input.kind === "product" ? input.unit : null,
        note,
      ],
    );
    if (input.kind === "product") {
      await db.query(
        `update shopping_list set catalog_request_id=$1
         where id_product is null and catalog_request_id is null
           and provisional_category_id=$2
           and lower(trim(provisional_name))=lower(trim($3))`,
        [created.rows[0].id, category, name],
      );
    }
  });
}
export async function getCatalogRequests(): Promise<CatalogRequest[]> {
  return withCatalog(async (db, email) =>
    (
      await db.query(
        "select * from catalog_requests where $1 or email=$2 order by created_at desc,id desc limit 200",
        [(await appRole(db, email)) === "admin", email],
      )
    ).rows.map((r) => ({ ...r, created_at: r.created_at.toISOString() })),
  );
}
export async function reviewCatalogRequest(
  id: string,
  decision: "approve" | "reject",
): Promise<void> {
  if (!["approve", "reject"].includes(decision))
    throw new DataError("Decisión inválida");
  await withCatalog(async (db, email) => {
    const r = await db.query(
      "select * from catalog_requests where id::text=$1 for update",
      [text(id)],
    );
    requireRow(r.rowCount);
    const request = r.rows[0];
    if (request.status !== "pending")
      throw new DataError("Esta solicitud ya fue revisada", 409);
    let resultId: null | string = null;
    if (decision === "approve") {
      if (request.kind === "category") {
        const existing = await db.query(
          "select id from catalog_categories where lower(trim(name))=lower(trim($1)) and not archived",
          [request.name],
        );
        resultId =
          existing.rows[0]?.id ??
          (
            await db.query(
              "insert into catalog_categories(name) values($1) returning id",
              [request.name],
            )
          ).rows[0].id;
      } else {
        requireRow(
          (
            await db.query(
              "select 1 from catalog_categories where id=$1 and not archived",
              [request.category_id],
            )
          ).rowCount,
        );
        const existing = await db.query(
          "select id,unit,available_units from catalog_products where lower(trim(name))=lower(trim($1)) and id_category=$2 and not archived order by id limit 1 for update",
          [request.name, request.category_id],
        );
        if (existing.rowCount) {
          resultId = existing.rows[0].id;
          const availableUnits = [
            ...new Set([
              ...existing.rows[0].available_units,
              ...compatibleUnits(request.unit),
              request.unit,
            ]),
          ];
          if (!isValidAvailableUnits(availableUnits, existing.rows[0].unit))
            throw new DataError("Unidades disponibles inválidas");
          await db.query(
            "update catalog_products set available_units=$2 where id=$1",
            [resultId, availableUnits],
          );
        } else {
          resultId = (
            await db.query(
              "insert into catalog_products(name,id_category,unit,available_units) values($1,$2,$3,$4) returning id",
              [
                request.name,
                request.category_id,
                request.unit,
                compatibleUnits(request.unit),
              ],
            )
          ).rows[0].id;
        }
        const provisionalItems = await db.query(
          "select id,household_id,unit,cantidad,comprado,provisional_available_units from shopping_list where catalog_request_id=$1 and id_product is null for update",
          [request.id],
        );
        const requestedUnits = [
          ...new Set([
            ...(existing.rows[0]?.available_units ??
              compatibleUnits(request.unit)),
            ...provisionalItems.rows.flatMap(
              (item) => item.provisional_available_units ?? [],
            ),
            request.unit,
          ]),
        ];
        const baseUnit = existing.rows[0]?.unit ?? request.unit;
        if (!isValidAvailableUnits(requestedUnits, baseUnit))
          throw new DataError("Unidades disponibles inválidas");
        await db.query(
          "update catalog_products set available_units=$2 where id=$1",
          [resultId, requestedUnits],
        );
        for (const item of provisionalItems.rows) {
          const current = await db.query(
            "select id,unit,comprado from shopping_list where household_id=$1 and id_product=$2 for update",
            [item.household_id, resultId],
          );
          if (current.rowCount) {
            if (
              !item.comprado &&
              !current.rows[0].comprado &&
              item.unit === current.rows[0].unit
            ) {
              await db.query(
                "update shopping_list set cantidad=coalesce(cantidad,0)+$3 where id=$1 and household_id=$2",
                [current.rows[0].id, item.household_id, item.cantidad ?? 0],
              );
              await db.query("delete from shopping_list where id=$1", [
                item.id,
              ]);
            }
            continue;
          }
          await db.query(
            `update shopping_list set id_product=$2,provisional_name=null,
              provisional_category_id=null,provisional_created_by=null,
              provisional_available_units=null,catalog_request_id=null
             where id=$1`,
            [item.id, resultId],
          );
          await db.query(
            "insert into list_selections(household_id,product_id,checked) values($1,$2,true) on conflict(household_id,product_id) do update set checked=true",
            [item.household_id, resultId],
          );
        }
      }
    }
    await db.query(
      "update catalog_requests set status=$2,result_id=$3,reviewed_by=$4,reviewed_at=now() where id=$1",
      [
        request.id,
        decision === "approve" ? "approved" : "rejected",
        resultId,
        email,
      ],
    );
  }, true);
}
