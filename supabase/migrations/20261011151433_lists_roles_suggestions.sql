-- Additive only: production still understands existing tables and owner membership.
alter table public.household_members add column role text not null default 'suggester' check(role in ('admin','suggester'));
create table public.list_suggestions (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households on delete cascade,
 email text not null, kind text not null check(kind in ('add','quantity','remove')),
 product_id text not null, quantity numeric check(quantity>0), unit text check(unit in ('un','kg','g','lt','ml')),
 note text not null default '' check(length(note)<=200), status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(), reviewed_at timestamptz, reviewed_by text,
 foreign key(household_id,product_id) references public.products(household_id,id) on delete cascade
);
create index list_suggestions_household_status_idx on public.list_suggestions(household_id,status,created_at);
alter table public.list_suggestions enable row level security;
revoke all on public.list_suggestions from anon,authenticated;
