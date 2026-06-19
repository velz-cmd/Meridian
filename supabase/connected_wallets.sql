-- Wallet connect registry + analytics RPC (run if upgrading an existing Supabase project)
create table if not exists connected_wallets (
  wallet text primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  connect_count int not null default 1,
  last_path text
);

create index if not exists connected_wallets_last_seen_idx on connected_wallets (last_seen desc);

alter table connected_wallets enable row level security;

drop policy if exists "Allow public read connected_wallets" on connected_wallets;
drop policy if exists "Allow public insert connected_wallets" on connected_wallets;
drop policy if exists "Allow public update connected_wallets" on connected_wallets;
create policy "Allow public read connected_wallets" on connected_wallets for select using (true);
create policy "Allow public insert connected_wallets" on connected_wallets for insert with check (true);
create policy "Allow public update connected_wallets" on connected_wallets for update using (true) with check (true);

create or replace function meridian_analytics_counts()
returns json
language sql
stable
as $$
  select json_build_object(
    'total_events', coalesce((select count(*)::int from product_events), 0),
    'unique_visitors', coalesce((select count(distinct visitor_id)::int from product_events), 0),
    'page_views_all', coalesce((select count(*)::int from product_events where kind = 'page_view'), 0),
    'actions_all', coalesce((select count(*)::int from product_events where kind <> 'page_view'), 0),
    'wallet_connect_events', coalesce((select count(*)::int from product_events where kind = 'nexus_wallet_connect'), 0),
    'first_event_at', (select min(created_at) from product_events)
  );
$$;
