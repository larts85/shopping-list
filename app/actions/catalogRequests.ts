"use server";
import {
  withCatalog,
  appRole,
  text,
  DataError,
  requireRow,
} from "../lib/database";
import { compatibleUnits, isUnit, type Unit } from "../lib/units";
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
    await db.query(
      "insert into catalog_requests(email,kind,name,category_id,unit,note) values($1,$2,$3,$4,$5,$6)",
      [
        email,
        input.kind,
        name,
        category,
        input.kind === "product" ? input.unit : null,
        note,
      ],
    );
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
          "select id from catalog_products where lower(trim(name))=lower(trim($1)) and id_category=$2 and unit=$3 and not archived order by id limit 1",
          [request.name, request.category_id, request.unit],
        );
        resultId =
          existing.rows[0]?.id ??
          (
            await db.query(
              "insert into catalog_products(name,id_category,unit,available_units) values($1,$2,$3,$4) returning id",
              [request.name, request.category_id, request.unit, compatibleUnits(request.unit)],
            )
          ).rows[0].id;
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
