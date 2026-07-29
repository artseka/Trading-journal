-- Trading Journal: safe one-time setup for the existing Supabase project.
-- Existing malformed tables are renamed as recoverable backups, not deleted.

begin;

create extension if not exists pgcrypto;

alter table if exists public.trades
  rename to trades_legacy_20260729;

alter table if exists public.capital
  rename to capital_legacy_20260729;

-- Lock the legacy tables. They contain schema-description rows from the old setup.
alter table if exists public.trades_legacy_20260729 enable row level security;
alter table if exists public.capital_legacy_20260729 enable row level security;
revoke all on table public.trades_legacy_20260729 from anon, authenticated;
revoke all on table public.capital_legacy_20260729 from anon, authenticated;

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trade_date date not null,
  pair text not null check (char_length(pair) between 1 and 40),
  side text not null check (side in ('buy', 'sell')),
  result text not null check (result in ('win', 'loss', 'breakeven')),
  pnl numeric(18, 2) not null default 0,
  rr text not null default '',
  strategy text not null default '',
  note text not null default '',
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.capital (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month_key text not null check (month_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  amount numeric(18, 2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_key)
);

create index trades_user_date_idx on public.trades (user_id, trade_date desc);
create index capital_user_month_idx on public.capital (user_id, month_key);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trades_set_updated_at
before update on public.trades
for each row execute function public.set_updated_at();

create trigger capital_set_updated_at
before update on public.capital
for each row execute function public.set_updated_at();

alter table public.trades enable row level security;
alter table public.capital enable row level security;

revoke all on table public.trades from anon;
revoke all on table public.capital from anon;
grant select, insert, update, delete on table public.trades to authenticated;
grant select, insert, update, delete on table public.capital to authenticated;

create policy "Users can read their own trades"
on public.trades for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own trades"
on public.trades for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own trades"
on public.trades for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own trades"
on public.trades for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their own capital"
on public.capital for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own capital"
on public.capital for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own capital"
on public.capital for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own capital"
on public.capital for delete
to authenticated
using ((select auth.uid()) = user_id);

commit;
