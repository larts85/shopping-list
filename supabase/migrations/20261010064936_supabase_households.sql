-- Google sessions are verified by NextAuth; only the server connects to Postgres.
-- The public Data API has no access to application data.
create table public.households (
 id uuid primary key default gen_random_uuid(), owner_email text not null,
 name text not null default 'Mi hogar', created_at timestamptz not null default now()
);
create table public.household_members (
 household_id uuid not null references public.households on delete cascade,
 email text not null, primary key (household_id,email)
);
create index household_members_email_idx on public.household_members(email);
create table public.user_preferences (
 email text primary key, household_id uuid not null references public.households
);
create table public.household_invitations (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households on delete cascade,
 email text not null, unique(household_id,email)
);
create index household_invitations_email_idx on public.household_invitations(email);
create table public.categories (
 id text primary key default gen_random_uuid()::text, household_id uuid not null references public.households on delete cascade,
 name text not null check(length(trim(name)) between 1 and 200), unique(household_id,id)
);
create table public.products (
 id text primary key default gen_random_uuid()::text, household_id uuid not null references public.households on delete cascade,
 name text not null check(length(trim(name)) between 1 and 200), id_category text not null,
 checked boolean not null default false, unique(household_id,id),
 foreign key(household_id,id_category) references public.categories(household_id,id) on delete restrict
);
create index products_category_idx on public.products(household_id,id_category);
create table public.shopping_list (
 id text primary key default gen_random_uuid()::text, household_id uuid not null references public.households on delete cascade,
 id_product text not null, cantidad numeric check(cantidad>0), medida numeric check(medida>0),
 precio numeric check(precio>=0), comprado boolean not null default false,
 unique(household_id,id_product),
 foreign key(household_id,id_product) references public.products(household_id,id) on delete cascade,
 check(not comprado or (cantidad is not null and medida is not null and precio is not null))
);
create table public.historical (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households on delete cascade,
 purchase jsonb not null, purchased_at timestamptz not null default now()
);
create index historical_household_date_idx on public.historical(household_id,purchased_at);
create table public.legacy_imports (
 household_id uuid primary key references public.households on delete cascade,
 sheet_id text not null, imported_at timestamptz not null default now()
);
DO $$ declare t text; begin
 foreach t in array array['households','household_members','user_preferences','household_invitations','categories','products','shopping_list','historical','legacy_imports'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
end $$;
