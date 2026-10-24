create table if not exists public.household_deletion_suggestions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  unique (household_id, email)
);
create index if not exists household_deletion_suggestions_owner_idx
  on public.household_deletion_suggestions(household_id, status, created_at);
