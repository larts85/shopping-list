-- Keep the isolated Vercel preview catalog compatible with this application update.
alter table if exists preview_lists.catalog_products
  add column if not exists urgent_purchase boolean not null default false;
