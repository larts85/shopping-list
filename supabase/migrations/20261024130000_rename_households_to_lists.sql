-- The product models shared shopping lists, not households. Preserve all IDs
-- and data while aligning database identifiers with the product model.
alter table public.households rename to lists;
alter table public.household_members rename to list_members;
alter table public.household_invitations rename to list_invitations;

alter table public.user_preferences rename column household_id to list_id;
alter table public.list_members rename column household_id to list_id;
alter table public.list_invitations rename column household_id to list_id;
alter table public.categories rename column household_id to list_id;
alter table public.products rename column household_id to list_id;
alter table public.shopping_list rename column household_id to list_id;
alter table public.historical rename column household_id to list_id;
alter table public.legacy_imports rename column household_id to list_id;
alter table public.list_suggestions rename column household_id to list_id;
alter table public.list_name_suggestions rename column household_id to list_id;
alter table public.list_selections rename column household_id to list_id;
do $$
begin
  if to_regclass('public.household_deletion_suggestions') is not null then
    alter table public.household_deletion_suggestions rename to list_deletion_suggestions;
    alter table public.list_deletion_suggestions rename column household_id to list_id;
  end if;
end $$;

alter index if exists public.household_members_email_idx rename to list_members_email_idx;
alter index if exists public.household_invitations_email_idx rename to list_invitations_email_idx;
alter index if exists public.historical_household_date_idx rename to historical_list_date_idx;
alter index if exists public.user_preferences_household_idx rename to user_preferences_list_idx;
alter index if exists public.list_suggestions_household_status_idx rename to list_suggestions_list_status_idx;
alter index if exists public.list_name_suggestions_household_idx rename to list_name_suggestions_list_idx;
alter index if exists public.household_deletion_suggestions_owner_idx rename to list_deletion_suggestions_owner_idx;
