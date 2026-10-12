-- Name changes are proposed by members and reviewed only by the owner.
create table public.list_name_suggestions (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households on delete cascade,
 email text not null,
 name text not null check(length(trim(name)) between 1 and 200),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz, reviewed_by text
);
create index list_name_suggestions_household_idx on public.list_name_suggestions(household_id,created_at);
alter table public.list_name_suggestions enable row level security;
revoke all on public.list_name_suggestions from anon,authenticated;
