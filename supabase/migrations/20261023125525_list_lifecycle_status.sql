alter table public.households
  add column status text not null default 'active',
  add constraint households_status_check
    check (status in ('active', 'completed'));

-- Keep lists that already have a purchase history out of active carts.
-- A list with remaining shopping_list rows is still an active, partial purchase.
update public.households h
set status = 'completed'
where exists (
    select 1 from public.historical i where i.household_id = h.id
  )
  and not exists (
    select 1 from public.shopping_list l where l.household_id = h.id
  );

update public.list_selections s
set checked = false
where exists (
  select 1 from public.households h
  where h.id = s.household_id and h.status = 'completed'
);

delete from public.user_preferences p
using public.households h
where h.id = p.household_id and h.status = 'completed';
