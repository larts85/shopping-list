-- Repair production databases that still accept the pre-list roles.
-- Keep already-migrated environments unchanged and preserve the historical
-- mapping that grants existing household members list editing access.
do $$
declare
  role_constraint text;
begin
  select pg_get_constraintdef(oid)
    into role_constraint
  from pg_constraint
  where conrelid = 'public.household_members'::regclass
    and conname = 'household_members_role_check';

  if role_constraint is null then
    raise exception 'Expected household_members_role_check on public.household_members';
  end if;

  if position('list_viewer' in role_constraint) = 0
     or position('list_editor' in role_constraint) = 0 then
    alter table public.household_members
      alter column role drop default;

    alter table public.household_members
      drop constraint household_members_role_check;

    update public.household_members
      set role = 'list_editor';

    alter table public.household_members
      alter column role set default 'list_editor';

    alter table public.household_members
      add constraint household_members_role_check
      check (role in ('list_viewer', 'list_editor'));
  end if;

  alter table public.household_members
    alter column role set default 'list_editor';
end
$$;
