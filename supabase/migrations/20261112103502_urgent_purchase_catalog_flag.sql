alter table public.catalog_products
  add column urgent_purchase boolean not null default false;
