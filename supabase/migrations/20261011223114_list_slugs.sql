-- Independent opaque identifiers; knowing a slug never grants membership.
-- Defaults backfill existing lists and cover every creation path, including imports.
alter table public.households
  add column slug text not null default ('lista-' || replace(gen_random_uuid()::text, '-', '')),
  add constraint households_slug_key unique (slug),
  add constraint households_slug_format check (slug ~ '^lista-[0-9a-f]{32}$');
