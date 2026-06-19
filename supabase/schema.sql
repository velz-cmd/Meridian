-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/pjtkiktpdvhghkqwqpok/sql

create table if not exists nexus_decisions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  payload jsonb not null
);

create table if not exists prism_predictions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists nexus_decisions_created_at_idx on nexus_decisions (created_at desc);
create index if not exists prism_predictions_created_at_idx on prism_predictions (created_at desc);

alter table nexus_decisions enable row level security;
alter table prism_predictions enable row level security;

drop policy if exists "Allow public read nexus" on nexus_decisions;
drop policy if exists "Allow public insert nexus" on nexus_decisions;
drop policy if exists "Allow public read prism" on prism_predictions;
drop policy if exists "Allow public insert prism" on prism_predictions;
create policy "Allow public read nexus" on nexus_decisions for select using (true);
create policy "Allow public insert nexus" on nexus_decisions for insert with check (true);
create policy "Allow public read prism" on prism_predictions for select using (true);
create policy "Allow public insert prism" on prism_predictions for insert with check (true);

-- Demo portfolio (per-wallet positions + trades — required for Vercel production)
create table if not exists demo_portfolios (
  wallet text primary key,
  updated_at timestamptz not null default now(),
  positions jsonb not null default '[]'::jsonb,
  trades jsonb not null default '[]'::jsonb
);

create index if not exists demo_portfolios_updated_idx on demo_portfolios (updated_at desc);

alter table demo_portfolios enable row level security;

drop policy if exists "Allow public read demo_portfolios" on demo_portfolios;
drop policy if exists "Allow public insert demo_portfolios" on demo_portfolios;
drop policy if exists "Allow public update demo_portfolios" on demo_portfolios;
create policy "Allow public read demo_portfolios" on demo_portfolios for select using (true);
create policy "Allow public insert demo_portfolios" on demo_portfolios for insert with check (true);
create policy "Allow public update demo_portfolios" on demo_portfolios for update using (true) with check (true);

-- Agent vault balances (per-wallet credits for Autopilot)
create table if not exists agent_vault_ledgers (
  wallet text primary key,
  updated_at timestamptz not null default now(),
  ledger jsonb not null default '{}'::jsonb
);

alter table agent_vault_ledgers enable row level security;
drop policy if exists "Allow public read agent_vault_ledgers" on agent_vault_ledgers;
drop policy if exists "Allow public insert agent_vault_ledgers" on agent_vault_ledgers;
drop policy if exists "Allow public update agent_vault_ledgers" on agent_vault_ledgers;
create policy "Allow public read agent_vault_ledgers" on agent_vault_ledgers for select using (true);
create policy "Allow public insert agent_vault_ledgers" on agent_vault_ledgers for insert with check (true);
create policy "Allow public update agent_vault_ledgers" on agent_vault_ledgers for update using (true) with check (true);

create table if not exists agent_vault_meta (
  id text primary key,
  updated_at timestamptz not null default now(),
  ledgers jsonb not null default '{}'::jsonb,
  last_scanned_block text
);

alter table agent_vault_meta enable row level security;
drop policy if exists "Allow public read agent_vault_meta" on agent_vault_meta;
drop policy if exists "Allow public insert agent_vault_meta" on agent_vault_meta;
drop policy if exists "Allow public update agent_vault_meta" on agent_vault_meta;
create policy "Allow public read agent_vault_meta" on agent_vault_meta for select using (true);
create policy "Allow public insert agent_vault_meta" on agent_vault_meta for insert with check (true);
create policy "Allow public update agent_vault_meta" on agent_vault_meta for update using (true) with check (true);

-- Product analytics — visits, actions, API usage (MERIDIAN /analytics dashboard)
create table if not exists product_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  visitor_id text not null,
  session_id text,
  kind text not null,
  path text,
  action text,
  symbol text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists product_events_created_at_idx on product_events (created_at desc);
create index if not exists product_events_kind_idx on product_events (kind, created_at desc);
create index if not exists product_events_visitor_idx on product_events (visitor_id, created_at desc);
create index if not exists product_events_path_idx on product_events (path, created_at desc);

alter table product_events enable row level security;

drop policy if exists "Allow public read product_events" on product_events;
drop policy if exists "Allow public insert product_events" on product_events;
create policy "Allow public read product_events" on product_events for select using (true);
create policy "Allow public insert product_events" on product_events for insert with check (true);

-- Wallet connect registry (MERIDIAN /analytics — unique wallets that connected)
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

-- Fast all-time counts for product_events (used by /api/bnb/analytics)
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
