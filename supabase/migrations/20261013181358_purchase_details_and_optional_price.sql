alter table public.shopping_list
  add column description text not null default '' check (char_length(description) <= 500);

alter table public.shopping_list
  drop constraint if exists shopping_list_check,
  add constraint shopping_list_purchased_values_check
    check (not comprado or (cantidad is not null and medida is not null));
