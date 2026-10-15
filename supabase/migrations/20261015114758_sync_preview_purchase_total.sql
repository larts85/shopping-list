-- This isolated schema is deployed alongside public but is not managed by the
-- Supabase migration history. Keep the preview purchase contract in sync while
-- leaving its existing rows, RLS policies, and grants untouched.
alter table if exists preview_lists.shopping_list
  add column if not exists precio_total numeric check (precio_total >= 0);
