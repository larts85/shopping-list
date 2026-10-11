-- Review-only until deployment. Preserve existing list IDs and historical snapshots.
create table public.app_users (
 email text primary key check(email=lower(email)),
 auth_user_id uuid unique references auth.users(id),
 role text not null default 'user' check(role in ('admin','user')),
 name text, created_at timestamptz not null default now(),
 check(role <> 'admin' or email='larts85@gmail.com')
);
insert into public.app_users(email,role)
select distinct email,case when email='larts85@gmail.com' then 'admin' else 'user' end from public.household_members;
insert into public.app_users(email,role) values('larts85@gmail.com','admin') on conflict(email) do update set role='admin';
create table public.catalog_categories (
 id text primary key default gen_random_uuid()::text,
 name text not null check(length(trim(name)) between 1 and 200),
 archived boolean not null default false
);
create unique index catalog_categories_name_idx on public.catalog_categories(lower(trim(name))) where not archived;
-- Normalize duplicated categories, preferring the admin's original IDs.
create temporary table category_mapping on commit drop as
select c.id old_id,first_value(c.id) over(partition by lower(trim(c.name)) order by (h.owner_email='larts85@gmail.com') desc,c.id) catalog_id
from public.categories c join public.households h on h.id=c.household_id;
insert into public.catalog_categories(id,name)
select c.id,c.name from public.categories c join category_mapping m on m.old_id=c.id where c.id=m.catalog_id;
create table public.catalog_products (
 id text primary key default gen_random_uuid()::text,
 name text not null check(length(trim(name)) between 1 and 200),
 id_category text not null references public.catalog_categories on delete restrict,
 unit text not null check(unit in ('un','kg','g','lt','ml')),
 archived boolean not null default false
);
create index catalog_products_category_idx on public.catalog_products(id_category);
-- Keep every product ID so existing purchases cannot be reassigned or collapsed.
insert into public.catalog_products(id,name,id_category,unit)
select p.id,p.name,m.catalog_id,p.unit from public.products p join category_mapping m on m.old_id=p.id_category;
create table public.list_selections (
 household_id uuid not null references public.households on delete cascade,
 product_id text not null references public.catalog_products on delete restrict,
 checked boolean not null default false, primary key(household_id,product_id)
);
insert into public.list_selections(household_id,product_id,checked) select household_id,id,checked from public.products;
alter table public.shopping_list drop constraint shopping_list_household_id_id_product_fkey;
alter table public.shopping_list add constraint shopping_list_catalog_product_fkey foreign key(id_product) references public.catalog_products(id) on delete restrict;
alter table public.list_suggestions drop constraint list_suggestions_household_id_product_id_fkey;
alter table public.list_suggestions add constraint list_suggestions_catalog_product_fkey foreign key(product_id) references public.catalog_products(id) on delete restrict;
create index list_selections_product_idx on public.list_selections(product_id);
create index shopping_list_catalog_product_idx on public.shopping_list(id_product);
create index list_suggestions_catalog_product_idx on public.list_suggestions(product_id);
create table public.catalog_requests (
 id uuid primary key default gen_random_uuid(), email text not null references public.app_users(email),
 kind text not null check(kind in ('category','product')),
 name text not null check(length(trim(name)) between 1 and 200),
 category_id text references public.catalog_categories(id),
 unit text check(unit in ('un','kg','g','lt','ml')),
 note text not null default '' check(length(note)<=200),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 result_id text, created_at timestamptz not null default now(),reviewed_at timestamptz,reviewed_by text references public.app_users(email),
 check((kind='category' and category_id is null and unit is null) or (kind='product' and category_id is not null and unit is not null))
);
create index catalog_requests_status_idx on public.catalog_requests(status,created_at);
create index catalog_requests_email_idx on public.catalog_requests(email,created_at);
create index catalog_requests_category_idx on public.catalog_requests(category_id);
create index catalog_requests_reviewer_idx on public.catalog_requests(reviewed_by);
DO $$ declare t text; begin
 foreach t in array array['app_users','catalog_categories','catalog_products','list_selections','catalog_requests'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
end $$;
