-- Existing shared members could edit list items; preserve that access as list_editor.
alter table public.household_members
  alter column role drop default;

alter table public.household_members
  drop constraint household_members_role_check;

update public.household_members set role='list_editor';

alter table public.household_members
  alter column role set default 'list_editor';

alter table public.household_members
  add constraint household_members_role_check
  check (role in ('list_viewer', 'list_editor'));
