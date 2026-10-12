-- Products may be purchased using multiple independently selectable units.
alter table public.catalog_products
  add column available_units text[] not null default array['un']::text[];

update public.catalog_products
set available_units = case unit
  when 'kg' then array['kg','g']::text[]
  when 'g' then array['kg','g']::text[]
  when 'lt' then array['lt','ml']::text[]
  when 'ml' then array['lt','ml']::text[]
  else array['un']::text[]
end;

alter table public.catalog_products
  add constraint catalog_products_available_units_check
  check (
    cardinality(available_units) between 1 and 5
    and available_units <@ array['un','kg','g','lt','ml']::text[]
    and unit = any(available_units)
  );
