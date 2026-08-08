-- Bean Languages — Curbside Ordering System
-- All timestamps stored in UTC. Business logic uses Asia/Riyadh.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.staff_role as enum ('ADMIN', 'MANAGER', 'STAFF');
create type public.order_status as enum (
  'PENDING_PAYMENT',
  'PAID',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'CUSTOMER_ARRIVED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED'
);
create type public.payment_status as enum (
  'PENDING',
  'AUTHORIZED',
  'PAID',
  'FAILED',
  'CANCELLED',
  'REFUNDED'
);
create type public.actor_type as enum ('CUSTOMER', 'STAFF', 'SYSTEM', 'PAYMENT_PROVIDER');
create type public.order_source as enum ('qr', 'link', 'repeat', 'admin');

-- ---------------------------------------------------------------------------
-- Profiles (staff/admin)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.staff_role not null default 'STAFF',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Store
-- ---------------------------------------------------------------------------
create table public.store_settings (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null default 'لغات البن',
  name_en text not null default 'Bean Languages',
  timezone text not null default 'Asia/Riyadh',
  currency text not null default 'SAR',
  tax_rate_bps integer not null default 1500 check (tax_rate_bps >= 0),
  service_fee_minor integer not null default 0 check (service_fee_minor >= 0),
  base_prep_minutes integer not null default 5 check (base_prep_minutes > 0),
  car_pickup_enabled boolean not null default true,
  temporary_pause boolean not null default false,
  max_active_car_orders integer not null default 12 check (max_active_car_orders > 0),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_hours (
  id uuid primary key default gen_random_uuid(),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_closed boolean not null default false,
  open_time time,
  close_time time,
  unique (day_of_week),
  check (
    is_closed = true
    or (open_time is not null and close_time is not null)
  )
);

create table public.store_special_hours (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  is_closed boolean not null default false,
  open_time time,
  close_time time,
  note text,
  check (
    is_closed = true
    or (open_time is not null and close_time is not null)
  )
);

-- ---------------------------------------------------------------------------
-- Menu
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ar text not null,
  name_en text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id),
  slug text not null unique,
  name_ar text not null,
  name_en text,
  description_ar text,
  description_en text,
  price_minor integer not null check (price_minor >= 0),
  image_path text,
  is_active boolean not null default true,
  is_available boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.modifier_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ar text not null,
  name_en text,
  required boolean not null default false,
  min_selection integer not null default 0 check (min_selection >= 0),
  max_selection integer not null default 1 check (max_selection >= 1),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_selection <= max_selection)
);

create table public.modifier_options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.modifier_groups (id) on delete cascade,
  slug text not null,
  name_ar text not null,
  name_en text,
  price_delta_minor integer not null default 0,
  is_active boolean not null default true,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, slug)
);

create table public.product_modifier_groups (
  product_id uuid not null references public.products (id) on delete cascade,
  modifier_group_id uuid not null references public.modifier_groups (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (product_id, modifier_group_id)
);

-- ---------------------------------------------------------------------------
-- Customers & vehicles
-- ---------------------------------------------------------------------------
create table public.anonymous_customers (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  phone text,
  first_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table public.customer_vehicles (
  id uuid primary key default gen_random_uuid(),
  anonymous_customer_id uuid references public.anonymous_customers (id) on delete cascade,
  make_model text not null,
  color text not null,
  plate_hint text,
  is_default boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (plate_hint is null or char_length(plate_hint) between 1 and 3)
);

create index customer_vehicles_anon_idx on public.customer_vehicles (anonymous_customer_id);

-- ---------------------------------------------------------------------------
-- Orders & payments
-- ---------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  public_order_number integer not null,
  customer_id uuid,
  anonymous_customer_id uuid references public.anonymous_customers (id),
  access_token_hash text not null,
  customer_name text,
  phone text not null,
  status public.order_status not null default 'PENDING_PAYMENT',
  vehicle_id uuid references public.customer_vehicles (id),
  car_make_model_snapshot text,
  car_color_snapshot text,
  plate_hint_snapshot text,
  location_hint text,
  flasher_confirmed boolean not null default false,
  customer_on_the_way boolean not null default false,
  location_help_requested boolean not null default false,
  subtotal_minor integer not null check (subtotal_minor >= 0),
  tax_amount_minor integer not null check (tax_amount_minor >= 0),
  service_fee_minor integer not null default 0 check (service_fee_minor >= 0),
  total_minor integer not null check (total_minor >= 0),
  currency text not null default 'SAR',
  source public.order_source not null default 'link',
  payment_status public.payment_status not null default 'PENDING',
  estimated_prep_min integer,
  estimated_prep_max integer,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  accepted_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  on_my_way_at timestamptz,
  customer_arrived_at timestamptz,
  out_for_delivery_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz
);

create sequence public.order_number_seq start 1;

create unique index orders_public_number_day_idx
  on public.orders (public_order_number, ((created_at at time zone 'Asia/Riyadh')::date));

create index orders_status_idx on public.orders (status);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_anon_idx on public.orders (anonymous_customer_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id),
  product_name_snapshot text not null,
  unit_price_minor integer not null check (unit_price_minor >= 0),
  quantity integer not null check (quantity > 0),
  line_total_minor integer not null check (line_total_minor >= 0),
  created_at timestamptz not null default now()
);

create table public.order_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  modifier_option_id uuid references public.modifier_options (id),
  group_name_snapshot text not null,
  option_name_snapshot text not null,
  price_delta_minor integer not null default 0
);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  event_type text not null,
  from_status public.order_status,
  to_status public.order_status,
  actor_type public.actor_type not null,
  actor_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index order_events_order_idx on public.order_events (order_id, created_at);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null,
  provider_payment_id text,
  status public.payment_status not null default 'PENDING',
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null default 'SAR',
  idempotency_key text not null unique,
  raw_safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz,
  refunded_at timestamptz
);

create unique index payments_provider_payment_id_uidx
  on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;

create table public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  anonymous_customer_id uuid references public.anonymous_customers (id),
  cart_snapshot jsonb not null,
  totals_snapshot jsonb not null,
  phone text,
  customer_name text,
  vehicle_snapshot jsonb,
  source public.order_source not null default 'link',
  order_id uuid references public.orders (id),
  status text not null default 'CREATED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes')
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger store_settings_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger modifier_groups_updated_at before update on public.modifier_groups
  for each row execute function public.set_updated_at();
create trigger modifier_options_updated_at before update on public.modifier_options
  for each row execute function public.set_updated_at();
create trigger anonymous_customers_updated_at before update on public.anonymous_customers
  for each row execute function public.set_updated_at();
create trigger customer_vehicles_updated_at before update on public.customer_vehicles
  for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger checkout_sessions_updated_at before update on public.checkout_sessions
  for each row execute function public.set_updated_at();

create or replace function public.current_staff_role()
returns public.staff_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and is_active = true
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active = true
  );
$$;

create or replace function public.is_manager_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_active = true
      and role in ('MANAGER', 'ADMIN')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_active = true
      and role = 'ADMIN'
  );
$$;

-- Active car order count for capacity
create or replace function public.active_car_order_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.orders
  where status in (
    'PAID', 'ACCEPTED', 'PREPARING', 'READY',
    'CUSTOMER_ARRIVED', 'OUT_FOR_DELIVERY'
  );
$$;

-- Atomic order transition with optimistic concurrency
create or replace function public.transition_order(
  p_order_id uuid,
  p_from_status public.order_status,
  p_to_status public.order_status,
  p_event_type text,
  p_actor_type public.actor_type,
  p_actor_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_ts timestamptz := now();
begin
  update public.orders
  set
    status = p_to_status,
    paid_at = case when p_to_status = 'PAID' then coalesce(paid_at, v_ts) else paid_at end,
    accepted_at = case when p_to_status = 'ACCEPTED' then coalesce(accepted_at, v_ts) else accepted_at end,
    preparing_at = case when p_to_status = 'PREPARING' then coalesce(preparing_at, v_ts) else preparing_at end,
    ready_at = case when p_to_status = 'READY' then coalesce(ready_at, v_ts) else ready_at end,
    customer_arrived_at = case when p_to_status = 'CUSTOMER_ARRIVED' then coalesce(customer_arrived_at, v_ts) else customer_arrived_at end,
    out_for_delivery_at = case when p_to_status = 'OUT_FOR_DELIVERY' then coalesce(out_for_delivery_at, v_ts) else out_for_delivery_at end,
    delivered_at = case when p_to_status = 'DELIVERED' then coalesce(delivered_at, v_ts) else delivered_at end,
    cancelled_at = case when p_to_status = 'CANCELLED' then coalesce(cancelled_at, v_ts) else cancelled_at end,
    refunded_at = case when p_to_status = 'REFUNDED' then coalesce(refunded_at, v_ts) else refunded_at end,
    payment_status = case
      when p_to_status = 'PAID' then 'PAID'::public.payment_status
      when p_to_status = 'REFUNDED' then 'REFUNDED'::public.payment_status
      else payment_status
    end,
    updated_at = v_ts
  where id = p_order_id
    and status = p_from_status
  returning * into v_order;

  if v_order.id is null then
    raise exception 'ORDER_TRANSITION_CONFLICT' using errcode = 'P0001';
  end if;

  insert into public.order_events (
    order_id, event_type, from_status, to_status, actor_type, actor_id, metadata
  ) values (
    p_order_id, p_event_type, p_from_status, p_to_status, p_actor_type, p_actor_id, p_metadata
  );

  return v_order;
end;
$$;

revoke all on function public.transition_order(uuid, public.order_status, public.order_status, text, public.actor_type, uuid, jsonb) from public;
grant execute on function public.transition_order(uuid, public.order_status, public.order_status, text, public.actor_type, uuid, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.store_settings enable row level security;
alter table public.store_hours enable row level security;
alter table public.store_special_hours enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.modifier_groups enable row level security;
alter table public.modifier_options enable row level security;
alter table public.product_modifier_groups enable row level security;
alter table public.anonymous_customers enable row level security;
alter table public.customer_vehicles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_modifiers enable row level security;
alter table public.order_events enable row level security;
alter table public.payments enable row level security;
alter table public.checkout_sessions enable row level security;

-- Profiles
create policy "staff_read_own_profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "admin_manage_profiles"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Store public read
create policy "anon_read_store_settings"
  on public.store_settings for select
  to anon, authenticated
  using (true);

create policy "manager_update_store_settings"
  on public.store_settings for update
  to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

create policy "anon_read_store_hours"
  on public.store_hours for select
  to anon, authenticated
  using (true);

create policy "manager_manage_store_hours"
  on public.store_hours for all
  to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

create policy "anon_read_special_hours"
  on public.store_special_hours for select
  to anon, authenticated
  using (true);

create policy "manager_manage_special_hours"
  on public.store_special_hours for all
  to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

-- Menu public read (active only for anon)
create policy "anon_read_active_categories"
  on public.categories for select
  to anon, authenticated
  using (is_active = true or public.is_manager_or_admin());

create policy "manager_manage_categories"
  on public.categories for all
  to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

create policy "anon_read_active_products"
  on public.products for select
  to anon, authenticated
  using (
    (is_active = true and archived_at is null)
    or public.is_manager_or_admin()
  );

create policy "manager_manage_products"
  on public.products for all
  to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

create policy "anon_read_active_modifier_groups"
  on public.modifier_groups for select
  to anon, authenticated
  using (is_active = true or public.is_manager_or_admin());

create policy "manager_manage_modifier_groups"
  on public.modifier_groups for all
  to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

create policy "anon_read_active_modifier_options"
  on public.modifier_options for select
  to anon, authenticated
  using (is_active = true or public.is_manager_or_admin());

create policy "manager_manage_modifier_options"
  on public.modifier_options for all
  to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

create policy "anon_read_product_modifier_groups"
  on public.product_modifier_groups for select
  to anon, authenticated
  using (true);

create policy "manager_manage_product_modifier_groups"
  on public.product_modifier_groups for all
  to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

-- Sensitive tables: no anon direct access (server uses service role)
-- Staff can read operational order data
create policy "staff_read_orders"
  on public.orders for select
  to authenticated
  using (public.is_staff());

create policy "staff_update_orders"
  on public.orders for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "staff_read_order_items"
  on public.order_items for select
  to authenticated
  using (public.is_staff());

create policy "staff_read_order_item_modifiers"
  on public.order_item_modifiers for select
  to authenticated
  using (public.is_staff());

create policy "staff_read_order_events"
  on public.order_events for select
  to authenticated
  using (public.is_staff());

create policy "staff_insert_order_events"
  on public.order_events for insert
  to authenticated
  with check (public.is_staff());

create policy "staff_read_payments"
  on public.payments for select
  to authenticated
  using (public.is_manager_or_admin() or public.is_staff());

-- Deny anon on sensitive tables by omitting policies (default deny with RLS on)
-- Explicit deny documentation: anonymous_customers, customer_vehicles,
-- checkout_sessions have no anon policies.

create policy "staff_read_vehicles"
  on public.customer_vehicles for select
  to authenticated
  using (public.is_staff());

-- Realtime publication
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_events;

-- Storage bucket for product images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "public_read_product_images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

create policy "manager_upload_product_images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images' and public.is_manager_or_admin());

create policy "manager_update_product_images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and public.is_manager_or_admin())
  with check (bucket_id = 'product-images' and public.is_manager_or_admin());

create policy "manager_delete_product_images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and public.is_manager_or_admin());

-- Order number helper + grants
create or replace function public.next_order_number()
returns integer
language sql
security definer
set search_path = public
as $$
  select nextval('public.order_number_seq')::integer;
$$;

grant execute on function public.next_order_number() to service_role;
grant execute on function public.active_car_order_count() to anon, authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_manager_or_admin() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_staff_role() to authenticated;
grant execute on function public.transition_order(uuid, public.order_status, public.order_status, text, public.actor_type, uuid, jsonb) to service_role, authenticated;
