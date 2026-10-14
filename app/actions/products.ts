"use server";
import {
  withHousehold,
  withListItemEditor,
  withListEditor,
  withCatalog,
  text,
  requireRow,
  DataError,
} from "../lib/database";
import {
  compatibleUnits,
  isUnit,
  isUnitAllowedForCategory,
  isValidAvailableUnits,
} from "../lib/units";
import { suggestProductUnit } from "../lib/productUnits";
import type { Unit } from "../lib/units";
import type { Product, ProductChecked, AddProduct } from "../lib/types";
export interface EditProductParams {
  idProduct: string;
  newNameProduct: string;
  idCategory?: string;
  unit?: Unit;
  availableUnits?: Unit[];
}
export async function getProducts(scope?: string): Promise<Product[]> {
  const products = await withHousehold(
    async (db, h) =>
      (
        await db.query(
          "select p.id,p.name,p.id_category,coalesce(s.checked,false) checked,p.unit,p.available_units from catalog_products p left join list_selections s on s.product_id=p.id and s.household_id=$1 where not p.archived order by p.name,p.id",
          [h],
        )
      ).rows,
    scope,
  );
  return products.map(({ available_units, ...product }) => ({
      ...product,
      availableUnits: available_units,
    }));
}
export async function addProduct(p: AddProduct): Promise<void> {
  if (p.unit !== undefined && !isUnit(p.unit))
    throw new DataError("Unidad inválida");
  await withCatalog(async (db) => {
    const category = await db.query(
      "select name from catalog_categories where id=$1 and not archived",
      [text(p.idCategory)],
    );
    requireRow(category.rowCount);
    const unit = p.unit ?? suggestProductUnit(p.name, category.rows[0].name);
    const availableUnits = p.availableUnits ?? compatibleUnits(unit);
    if (!isValidAvailableUnits(availableUnits, unit))
      throw new DataError("Unidades disponibles inválidas");
    if (
      availableUnits.some(
        (availableUnit) =>
          !isUnitAllowedForCategory(availableUnit, category.rows[0].name),
      )
    )
      throw new DataError("Los comprimidos solo están disponibles en Farmacia");
    await db.query(
      "insert into catalog_products(name,id_category,unit,available_units) values($1,$2,$3,$4)",
      [
        text(p.name),
        p.idCategory,
        unit,
        availableUnits,
      ],
    );
  }, true);
}
export async function getProductsByCategory(id: string): Promise<Product[]> {
  return (await getProducts()).filter((p) => p.id_category === text(id));
}
export async function getProductsByCategories(): Promise<
  Record<string, Product[]>
> {
  return (await getProducts()).reduce(
    (a, p) => {
      (a[p.id_category] ||= []).push(p);
      return a;
    },
    {} as Record<string, Product[]>,
  );
}
export async function getProductsChecked(): Promise<Product[]> {
  return (await getProducts()).filter((p) => p.checked);
}
export async function editNameProduct(p: EditProductParams): Promise<void> {
  if (p.unit !== undefined && !isUnit(p.unit))
    throw new DataError("Unidad inválida");
  if (p.idCategory !== undefined && !text(p.idCategory))
    throw new DataError("Categoría inválida");
  await withCatalog(async (db) => {
    const nextUnit = p.unit;
    const nextAvailableUnits = p.availableUnits;
    if (
      nextUnit !== undefined &&
      nextAvailableUnits !== undefined &&
      !isValidAvailableUnits(nextAvailableUnits, nextUnit)
    )
      throw new DataError("Unidades disponibles inválidas");
    const previous = await db.query(
      `select p.unit,p.available_units,c.name as category_name
       from catalog_products p join catalog_categories c on c.id=p.id_category
       where p.id=$1 and not p.archived for update of p`,
      [text(p.idProduct)],
    );
    requireRow(previous.rowCount);
    let targetCategoryName = previous.rows[0].category_name as string;
    if (p.idCategory !== undefined) {
      const category = await db.query(
        "select name from catalog_categories where id=$1 and not archived",
        [text(p.idCategory)],
      );
      requireRow(category.rowCount);
      targetCategoryName = category.rows[0].name;
    }
    const availableUnits =
      nextAvailableUnits ?? previous.rows[0].available_units;
    const unit = nextUnit ?? previous.rows[0].unit;
    if (!isValidAvailableUnits(availableUnits, unit))
      throw new DataError("La unidad principal debe estar disponible");
    if (
      availableUnits.some(
        (availableUnit) =>
          !isUnitAllowedForCategory(availableUnit, targetCategoryName),
      )
    )
      throw new DataError("Los comprimidos solo están disponibles en Farmacia");
    if (nextAvailableUnits !== undefined || nextUnit !== undefined) {
      const incompatible = await db.query(
        "select 1 from shopping_list where id_product=$1 and unit is not null and not (unit=any($2::text[])) limit 1",
        [p.idProduct, availableUnits],
      );
      if (incompatible.rowCount)
        throw new DataError(
          "No puedes quitar una unidad que ya está seleccionada en una lista activa",
          409,
        );
    }
    requireRow(
      (
        await db.query(
          "update catalog_products set name=$2,unit=$3,available_units=$4,id_category=coalesce($5,id_category) where id=$1 and not archived",
          [p.idProduct, text(p.newNameProduct), unit, availableUnits, p.idCategory ? text(p.idCategory) : null],
        )
      ).rowCount,
    );
  }, true);
}

export interface BulkEditProductsInput {
  productIds: string[];
  idCategory?: string;
  unit?: Unit;
  availableUnits?: Unit[];
  action?: "update" | "delete";
}

export async function bulkEditProducts(input: BulkEditProductsInput): Promise<void> {
  if (!input || !Array.isArray(input.productIds) || !input.productIds.length || input.productIds.length > 500)
    throw new DataError("Selecciona entre 1 y 500 productos");
  const ids = [...new Set(input.productIds.map((id) => text(id)))];
  if (ids.length !== input.productIds.length)
    throw new DataError("La selección contiene productos repetidos");
  if (input.action !== undefined && input.action !== "update" && input.action !== "delete")
    throw new DataError("Acción inválida");
  if (input.action === "delete") {
    await withCatalog(async (db) => {
      const archived = await db.query(
        "update catalog_products set archived=true where id=any($1::text[]) and not archived returning id",
        [ids],
      );
      if (archived.rowCount !== ids.length)
        throw new DataError("Uno o más productos ya no existen", 404);
    }, true);
    return;
  }
  if (input.unit !== undefined && !isUnit(input.unit))
    throw new DataError("Unidad principal inválida");
  if (
    input.availableUnits !== undefined &&
    (!Array.isArray(input.availableUnits) ||
      !input.availableUnits.length ||
      input.availableUnits.length > 5 ||
      input.availableUnits.some((unit) => !isUnit(unit)) ||
      new Set(input.availableUnits).size !== input.availableUnits.length)
  )
    throw new DataError("Unidades disponibles inválidas");
  if (!input.idCategory && input.unit === undefined && input.availableUnits === undefined)
    throw new DataError("Indica una categoría o las unidades para aplicar");
  await withCatalog(async (db) => {
    const products = await db.query(
      `select p.id,p.unit,p.available_units,c.name as category_name
       from catalog_products p join catalog_categories c on c.id=p.id_category
       where p.id=any($1::text[]) and not p.archived for update of p`,
      [ids],
    );
    if (products.rowCount !== ids.length)
      throw new DataError("Uno o más productos ya no existen", 404);
    let targetCategoryName: string | undefined;
    if (input.idCategory) {
      const category = await db.query(
        "select name from catalog_categories where id=$1 and not archived",
        [text(input.idCategory)],
      );
      requireRow(category.rowCount);
      targetCategoryName = category.rows[0].name;
    }
    for (const product of products.rows) {
      const availableUnits = input.availableUnits ?? product.available_units;
      const unit = input.unit ??
        (availableUnits.includes(product.unit) ? product.unit : availableUnits[0]);
      if (!isValidAvailableUnits(availableUnits, unit))
        throw new DataError("La unidad principal debe estar disponible");
      const categoryName = targetCategoryName ?? product.category_name;
      if (
        availableUnits.some(
          (availableUnit) =>
            !isUnitAllowedForCategory(availableUnit, categoryName),
        )
      )
        throw new DataError("Los comprimidos solo están disponibles en Farmacia");
      if (input.availableUnits !== undefined) {
        const incompatible = await db.query(
          "select 1 from shopping_list where id_product=$1 and unit is not null and not (unit=any($2::text[])) limit 1",
          [product.id, availableUnits],
        );
        if (incompatible.rowCount)
          throw new DataError(
            "No puedes quitar unidades que ya están seleccionadas en listas activas",
            409,
          );
      }
      await db.query(
        "update catalog_products set id_category=coalesce($2,id_category),unit=$3,available_units=$4 where id=$1",
        [product.id, input.idCategory ? text(input.idCategory) : null, unit, availableUnits],
      );
    }
  }, true);
}
async function selectProduct(
  db: import("pg").PoolClient,
  h: string,
  id: string,
  checked: boolean,
) {
  requireRow(
    (
      await db.query(
        "select 1 from catalog_products where id=$1 and not archived",
        [text(id)],
      )
    ).rowCount,
  );
  await db.query(
    "insert into list_selections(household_id,product_id,checked) values($1,$2,$3) on conflict(household_id,product_id) do update set checked=excluded.checked",
    [h, id, checked],
  );
}
export async function editCheckedProduct(p: ProductChecked): Promise<void> {
  if (typeof p.checked !== "boolean") throw new DataError("Selección inválida");
  await withListItemEditor(async (db, h) =>
    selectProduct(db, h, p.idProduct, p.checked),
  );
}
export async function editCheckedProducts(products: Product[]): Promise<void> {
  if (!Array.isArray(products) || products.length > 500)
    throw new DataError("Productos inválidos");
  await withListItemEditor(async (db, h) => {
    for (const p of products) {
      if (typeof p.checked !== "boolean")
        throw new DataError("Selección inválida");
      await selectProduct(db, h, p.id, p.checked);
    }
  });
}
export async function unCheckProducts(): Promise<void> {
  await withListEditor(async (db, h) => {
    await db.query(
      "update list_selections set checked=false where household_id=$1 and product_id in(select id_product from shopping_list where household_id=$1 and comprado)",
      [h],
    );
  });
}
export async function deleteProductById(id: string): Promise<void> {
  await withCatalog(async (db) => {
    requireRow(
      (
        await db.query(
          "update catalog_products set archived=true where id=$1 and not archived",
          [text(id)],
        )
      ).rowCount,
    );
  }, true);
}
