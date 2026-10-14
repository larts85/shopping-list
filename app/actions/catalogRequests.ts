"use server";
import {
  withCatalog,
  appRole,
  text,
  DataError,
  requireRow,
  ensureHousehold,
} from "../lib/database";
import type { PoolClient } from "pg";
import {
  compatibleUnits,
  isUnitAllowedForCategory,
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
export interface CatalogRequestSubmissionResult {
  kind: CatalogRequestInput["kind"];
  addedToList: boolean;
}
export async function submitCatalogRequest(
  input: CatalogRequestInput,
  scope?: string,
): Promise<CatalogRequestSubmissionResult> {
  if (!input || !["category", "product"].includes(input.kind))
    throw new DataError("Solicitud inválida");
  const name = text(input.name),
    note = input.note?.trim() || "";
  if (note.length > 200) throw new DataError("Nota demasiado larga");
  if (input.kind === "product" && !isUnit(input.unit))
    throw new DataError("Unidad inválida");
  return withCatalog(async (db, email) => {
    const category = input.kind === "product" ? text(input.categoryId) : null;
    if (category) {
      const categoryResult = await db.query(
        "select name from catalog_categories where id=$1 and not archived",
        [category],
      );
      requireRow(categoryResult.rowCount);
      if (
        input.unit &&
        !isUnitAllowedForCategory(input.unit, categoryResult.rows[0].name)
      )
        throw new DataError(
          "Los comprimidos solo están disponibles en Farmacia",
        );
    }
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
        `update shopping_list l set catalog_request_id=$1
         where l.id_product is null and l.catalog_request_id is null
           and l.provisional_category_id=$2
           and lower(trim(l.provisional_name))=lower(trim($3))
           and exists (
             select 1 from household_members m
             where m.household_id=l.household_id and m.email=$4
           )`,
        [created.rows[0].id, category, name, email],
      );

      let householdId: string;
      if (scope !== undefined) {
        householdId = text(scope).toLowerCase();
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            householdId,
          )
        )
          throw new DataError("Lista inválida");
        requireRow(
          (
            await db.query(
              "select 1 from household_members where household_id=$1 and email=$2",
              [householdId, email],
            )
          ).rowCount,
        );
      } else {
        try {
          householdId = await ensureHousehold(db, email);
        } catch (error) {
          if (error instanceof DataError && error.status === 409)
            return { kind: input.kind, addedToList: false };
          throw error;
        }
      }
      await db.query("select pg_advisory_xact_lock(hashtextextended($1,1))", [
        householdId,
      ]);

      const catalogProduct = await db.query(
        `select id,unit,available_units from catalog_products
         where lower(trim(name))=lower(trim($1)) and id_category=$2 and not archived
         order by id limit 1 for update`,
        [name, category],
      );
      if (
        catalogProduct.rowCount &&
        catalogProduct.rows[0].available_units.includes(input.unit)
      ) {
        const productId = catalogProduct.rows[0].id as string;
        await db.query(
          "insert into list_selections(household_id,product_id,checked) values($1,$2,true) on conflict(household_id,product_id) do update set checked=true",
          [householdId, productId],
        );
        await db.query(
          `insert into shopping_list(household_id,id_product,cantidad,medida,precio,comprado,unit)
           values($1,$2,1,1,0,false,$3) on conflict(household_id,id_product)
           do update set comprado=false,precio=0`,
          [householdId, productId, input.unit],
        );
        return { kind: input.kind, addedToList: true };
      }

      const provisional = await db.query(
        `select id from shopping_list
         where household_id=$1 and id_product is null
           and provisional_category_id=$2
           and lower(trim(provisional_name))=lower(trim($3)) for update`,
        [householdId, category, name],
      );
      if (provisional.rowCount) {
        await db.query(
          `update shopping_list set catalog_request_id=coalesce(catalog_request_id,$3),
             comprado=false,precio=0
           where household_id=$1 and id=$2`,
          [householdId, provisional.rows[0].id, created.rows[0].id],
        );
      } else {
        await db.query(
          `insert into shopping_list(
             household_id,id_product,cantidad,medida,precio,comprado,unit,
             provisional_name,provisional_category_id,provisional_created_by,
             provisional_available_units,catalog_request_id
           ) values($1,null,1,1,0,false,$2,$3,$4,$5,$6,$7)`,
          [
            householdId,
            input.unit,
            name,
            category,
            email,
            compatibleUnits(input.unit!),
            created.rows[0].id,
          ],
        );
      }
      return { kind: input.kind, addedToList: true };
    }
    return { kind: input.kind, addedToList: false };
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
  return reviewCatalogRequests([id], decision);
}

export async function reviewCatalogRequests(
  ids: string[],
  decision: "approve" | "reject",
): Promise<void> {
  if (!["approve", "reject"].includes(decision))
    throw new DataError("Decisión inválida");
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > 200 ||
    ids.some((id) => typeof id !== "string" || !id.trim() || id.length > 200)
  )
    throw new DataError("Selecciona entre 1 y 200 solicitudes válidas");
  const requestIds = [...new Set(ids.map((id) => id.trim()))].sort();
  if (requestIds.length !== ids.length)
    throw new DataError("La selección contiene solicitudes repetidas");
  await withCatalog(async (db, email) => {
    for (const id of requestIds)
      await reviewCatalogRequestInTransaction(db, email, id, decision);
  }, true);
}

async function reviewCatalogRequestInTransaction(
  db: PoolClient,
  email: string,
  id: string,
  decision: "approve" | "reject",
): Promise<void> {
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
      const requestCategory = await db.query(
        "select name from catalog_categories where id=$1 and not archived",
        [request.category_id],
      );
      requireRow(requestCategory.rowCount);
      if (
        isUnit(request.unit) &&
        !isUnitAllowedForCategory(request.unit, requestCategory.rows[0].name)
      )
        throw new DataError(
          "Los comprimidos solo están disponibles en Farmacia",
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
            await db.query("delete from shopping_list where id=$1", [item.id]);
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
}
