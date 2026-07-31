-- Multi-user registration support. Run after setup.sql.

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  constraint profiles_username_format
    check (username = lower(username) and username ~ '^[a-z0-9_]{3,20}$')
);

create unique index if not exists profiles_username_unique_idx
on public.profiles ((lower(username)));

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create or replace function public.create_trading_journal_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_username text;
begin
  normalized_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  if normalized_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'Username must contain 3-20 lowercase letters, numbers, or underscores';
  end if;
  insert into public.profiles (id, username) values (new.id, normalized_username);
  return new;
end;
$$;

drop trigger if exists create_trading_journal_profile on auth.users;
create trigger create_trading_journal_profile
after insert on auth.users
for each row execute function public.create_trading_journal_profile();

create or replace function public.is_username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    lower(trim(candidate)) ~ '^[a-z0-9_]{3,20}$'
    and not exists (
      select 1 from public.profiles
      where lower(username) = lower(trim(candidate))
    );
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

insert into public.profiles (id, username)
select id, 'sekaspn'
from auth.users
where lower(email) = 'sekaspn0220@gmail.com'
on conflict (id) do update set username = excluded.username;

commit;
