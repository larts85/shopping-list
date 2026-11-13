-- Discounts can be configured for a list and for each cart item.
-- Historical purchases keep immutable snapshots inside historical.purchase JSON.
alter table public.lists
  add column if not exists discount_type text,
  add column if not exists discount_value numeric;

alter table public.lists
  drop constraint if exists lists_discount_check,
  add constraint lists_discount_check check (
    (discount_type is null and discount_value is null)
    or (discount_type = 'percent' and discount_value is not null and discount_value between 0 and 100)
    or (discount_type = 'amount' and discount_value is not null and discount_value >= 0)
  );

alter table public.shopping_list
  add column if not exists discount_type text,
  add column if not exists discount_value numeric;

alter table public.shopping_list
  drop constraint if exists shopping_list_discount_check,
  add constraint shopping_list_discount_check check (
    (discount_type is null and discount_value is null)
    or (discount_type = 'percent' and discount_value is not null and discount_value between 0 and 100)
    or (discount_type = 'amount' and discount_value is not null and discount_value >= 0)
  );

alter table if exists preview_lists.lists
  add column if not exists discount_type text,
  add column if not exists discount_value numeric;

alter table if exists preview_lists.lists
  drop constraint if exists lists_discount_check,
  add constraint lists_discount_check check (
    (discount_type is null and discount_value is null)
    or (discount_type = 'percent' and discount_value is not null and discount_value between 0 and 100)
    or (discount_type = 'amount' and discount_value is not null and discount_value >= 0)
  );

alter table if exists preview_lists.shopping_list
  add column if not exists discount_type text,
  add column if not exists discount_value numeric;

alter table if exists preview_lists.shopping_list
  drop constraint if exists shopping_list_discount_check,
  add constraint shopping_list_discount_check check (
    (discount_type is null and discount_value is null)
    or (discount_type = 'percent' and discount_value is not null and discount_value between 0 and 100)
    or (discount_type = 'amount' and discount_value is not null and discount_value >= 0)
  );
