-- Additive migration: numeric legacy measurements and historical JSON are preserved.
alter table public.products add column unit text not null default 'un'
  check (unit in ('un','kg','g','lt','ml'));
alter table public.shopping_list add column unit text
  check (unit in ('un','kg','g','lt','ml'));
-- Existing list rows retain null unit until explicitly edited to avoid guessing their old measurement.
