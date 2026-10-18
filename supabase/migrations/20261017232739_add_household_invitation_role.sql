-- Persist the access chosen when inviting a household member.
alter table public.household_invitations
  add column role text not null default 'list_editor'
  check (role in ('list_viewer', 'list_editor'));
