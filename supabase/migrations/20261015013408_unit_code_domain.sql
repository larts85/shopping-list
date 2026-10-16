-- Keep the shared set of unit codes in one reusable database type.
create domain public.unit_code as text
  check (value in ('un', 'kg', 'g', 'mg', 'comp', 'lt', 'ml'));

-- Remove checks that depend on these text columns before changing their types.
alter table public.products
  drop constraint if exists products_unit_check;
alter table public.shopping_list
  drop constraint if exists shopping_list_unit_check,
  drop constraint if exists shopping_list_provisional_item_check;
alter table public.catalog_products
  drop constraint if exists catalog_products_unit_check,
  drop constraint if exists catalog_products_available_units_check;
alter table public.list_suggestions
  drop constraint if exists list_suggestions_unit_check;
alter table public.catalog_requests
  drop constraint if exists catalog_requests_unit_check;

-- Scalar unit columns use the shared type instead of repeating CHECK lists.
alter table public.products
  alter column unit drop default,
  alter column unit type public.unit_code using unit::public.unit_code,
  alter column unit set default 'un'::public.unit_code;

alter table public.shopping_list
  alter column unit type public.unit_code using unit::public.unit_code;

alter table public.catalog_products
  alter column unit type public.unit_code using unit::public.unit_code;

alter table public.list_suggestions
  alter column unit type public.unit_code using unit::public.unit_code;

alter table public.catalog_requests
  alter column unit type public.unit_code using unit::public.unit_code;

-- Keep unit collections as text[] for the app's existing PostgreSQL array handling.
alter table public.catalog_products
  add constraint catalog_products_available_units_check check (
    cardinality(available_units) between 1 and 5
    and available_units <@ array['un', 'kg', 'g', 'mg', 'comp', 'lt', 'ml']::text[]
    and unit::text = any(available_units)
  );

alter table public.shopping_list
  add constraint shopping_list_provisional_item_check check (
    (id_product is not null and provisional_name is null
      and provisional_category_id is null and provisional_created_by is null
      and provisional_available_units is null)
    or
    (id_product is null and provisional_name is not null
      and length(trim(provisional_name)) between 1 and 200
      and provisional_category_id is not null and provisional_created_by is not null
      and provisional_available_units is not null
      and cardinality(provisional_available_units) between 1 and 5
      and provisional_available_units <@ array[
        'un', 'kg', 'g', 'mg', 'comp', 'lt', 'ml'
      ]::text[]
      and unit is not null and unit::text = any(provisional_available_units))
  );
