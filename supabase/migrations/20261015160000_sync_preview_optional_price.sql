-- The isolated preview schema does not receive public-schema migrations
-- automatically. Keep purchased rows compatible with optional prices there.
alter table if exists preview_lists.shopping_list
  drop constraint if exists shopping_list_check,
  drop constraint if exists shopping_list_purchased_values_check,
  add constraint shopping_list_purchased_values_check
    check (not comprado or (cantidad is not null and medida is not null));
