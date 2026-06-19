-- Product analytics — page views, actions, API usage (public read for dashboard)
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
