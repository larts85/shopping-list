alter table public.shopping_list
  add column precio_total numeric check (precio_total >= 0);
