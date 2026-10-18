-- Let an existing app administrator assign the established app roles.
-- The first administrator remains bootstrapped as larts85@gmail.com.
alter table public.app_users
  drop constraint app_users_check;
