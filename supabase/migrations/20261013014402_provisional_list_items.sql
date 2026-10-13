-- Keep pasted, unapproved products local to the list that introduced them.
alter table public.shopping_list
  alter column id_product drop not null,
  add column provisional_name text,
  add column provisional_category_id text references public.catalog_categories(id) on delete restrict,
  add column provisional_created_by text references public.app_users(email),
  add column provisional_available_units text[],
  add column catalog_request_id uuid references public.catalog_requests(id) on delete set null;

alter table public.shopping_list
  add constraint shopping_list_provisional_item_check
  check (
    (id_product is not null and provisional_name is null and provisional_category_id is null
      and provisional_created_by is null and provisional_available_units is null)
    or
    (id_product is null and provisional_name is not null and length(trim(provisional_name)) between 1 and 200
      and provisional_category_id is not null and provisional_created_by is not null
      and provisional_available_units is not null
      and cardinality(provisional_available_units) between 1 and 5
      and provisional_available_units <@ array['un','kg','g','lt','ml']::text[]
      and unit is not null and unit = any(provisional_available_units))
  );

create unique index shopping_list_provisional_key_idx
  on public.shopping_list(household_id,provisional_category_id,lower(trim(provisional_name)))
  where id_product is null;
create index shopping_list_catalog_request_idx
  on public.shopping_list(catalog_request_id) where catalog_request_id is not null;
