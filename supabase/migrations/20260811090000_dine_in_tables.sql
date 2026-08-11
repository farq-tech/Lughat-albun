-- Dine-in tables: cafe_tables → table_sessions → orders
-- Keeps curbside intact via order_type.

create type public.order_type as enum ('CURBSIDE', 'DINE_IN');
create type public.table_session_status as enum ('OPEN', 'CLOSED');

create table public.cafe_tables (
  id uuid primary key default gen_random_uuid(),
  table_number integer not null,
  label text,
  qr_token_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (table_number),
  unique (qr_token_hash),
  check (table_number > 0)
);

create table public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.cafe_tables (id) on delete cascade,
  status public.table_session_status not null default 'OPEN',
  started_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'OPEN' and closed_at is null)
    or (status = 'CLOSED' and closed_at is not null)
  )
);

-- At most one OPEN session per table
create unique index table_sessions_one_open_per_table
  on public.table_sessions (table_id)
  where status = 'OPEN';

create index table_sessions_table_idx on public.table_sessions (table_id, started_at desc);

alter table public.orders
  add column order_type public.order_type not null default 'CURBSIDE',
  add column table_id uuid references public.cafe_tables (id),
  add column table_session_id uuid references public.table_sessions (id),
  add column table_number_snapshot integer;

create index orders_table_id_idx on public.orders (table_id) where table_id is not null;
create index orders_table_session_idx on public.orders (table_session_id)
  where table_session_id is not null;
create index orders_order_type_idx on public.orders (order_type);

alter table public.orders
  add constraint orders_dine_in_requires_table check (
    order_type <> 'DINE_IN'
    or (table_id is not null and table_session_id is not null)
  );

alter table public.orders
  add constraint orders_curbside_no_table check (
    order_type <> 'CURBSIDE'
    or (table_id is null and table_session_id is null)
  );

create trigger cafe_tables_updated_at before update on public.cafe_tables
  for each row execute function public.set_updated_at();
create trigger table_sessions_updated_at before update on public.table_sessions
  for each row execute function public.set_updated_at();

alter table public.cafe_tables enable row level security;
alter table public.table_sessions enable row level security;

-- Staff can read tables/sessions; managers manage tables
create policy "staff_read_cafe_tables"
  on public.cafe_tables for select
  to authenticated
  using (public.is_staff());

create policy "manager_manage_cafe_tables"
  on public.cafe_tables for all
  to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

create policy "staff_read_table_sessions"
  on public.table_sessions for select
  to authenticated
  using (public.is_staff());

create policy "staff_update_table_sessions"
  on public.table_sessions for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "manager_insert_table_sessions"
  on public.table_sessions for insert
  to authenticated
  with check (public.is_manager_or_admin() or public.is_staff());

-- Seed demo tables (tokens known for local/test). Hashes = sha256 of opaque tokens.
-- table_token_seed_01 … table_token_seed_08
insert into public.cafe_tables (table_number, label, qr_token_hash) values
  (1, 'طاولة 1', encode(digest('table_token_seed_01', 'sha256'), 'hex')),
  (2, 'طاولة 2', encode(digest('table_token_seed_02', 'sha256'), 'hex')),
  (3, 'طاولة 3', encode(digest('table_token_seed_03', 'sha256'), 'hex')),
  (4, 'طاولة 4', encode(digest('table_token_seed_04', 'sha256'), 'hex')),
  (5, 'طاولة 5', encode(digest('table_token_seed_05', 'sha256'), 'hex')),
  (6, 'طاولة 6', encode(digest('table_token_seed_06', 'sha256'), 'hex')),
  (7, 'طاولة 7', encode(digest('table_token_seed_07', 'sha256'), 'hex')),
  (8, 'طاولة 8', encode(digest('table_token_seed_08', 'sha256'), 'hex'));
