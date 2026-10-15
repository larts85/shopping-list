-- The isolated preview schema does not receive public-schema migrations
-- automatically. History snapshots read this column when archiving purchases.
alter table if exists preview_lists.shopping_list
  add column if not exists description text not null default '';

alter table if exists preview_lists.shopping_list
  drop constraint if exists shopping_list_description_check,
  add constraint shopping_list_description_check
    check (char_length(description) <= 500);
