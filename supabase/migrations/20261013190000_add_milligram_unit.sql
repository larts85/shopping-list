-- Allow products, list entries and suggestions to use milligrams.
alter table public.products
  drop constraint if exists products_unit_check,
  add constraint products_unit_check check (unit in ('un','kg','g','mg','lt','ml'));

alter table public.shopping_list
  drop constraint if exists shopping_list_unit_check,
  add constraint shopping_list_unit_check check (unit is null or unit in ('un','kg','g','mg','lt','ml'));

alter table public.catalog_products
  drop constraint if exists catalog_products_unit_check,
  add constraint catalog_products_unit_check check (unit in ('un','kg','g','mg','lt','ml'));

alter table public.list_suggestions
  drop constraint if exists list_suggestions_unit_check,
  add constraint list_suggestions_unit_check check (unit is null or unit in ('un','kg','g','mg','lt','ml'));

alter table public.catalog_requests
  drop constraint if exists catalog_requests_unit_check,
  add constraint catalog_requests_unit_check check (unit is null or unit in ('un','kg','g','mg','lt','ml'));

alter table public.catalog_products
  drop constraint if exists catalog_products_available_units_check,
  add constraint catalog_products_available_units_check check (
    cardinality(available_units) between 1 and 5
    and available_units <@ array['un','kg','g','mg','lt','ml']::text[]
    and unit = any(available_units)
  );

alter table public.shopping_list
  drop constraint if exists shopping_list_provisional_item_check,
  add constraint shopping_list_provisional_item_check check (
    (id_product is not null and provisional_name is null and provisional_category_id is null
      and provisional_created_by is null and provisional_available_units is null)
    or
    (id_product is null and provisional_name is not null and length(trim(provisional_name)) between 1 and 200
      and provisional_category_id is not null and provisional_created_by is not null
      and provisional_available_units is not null
      and cardinality(provisional_available_units) between 1 and 5
      and provisional_available_units <@ array['un','kg','g','mg','lt','ml']::text[]
      and unit is not null and unit = any(provisional_available_units))
  );
