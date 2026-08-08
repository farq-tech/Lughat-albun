-- Non-destructive: separate customer presence from kitchen order status.
-- Legacy statuses (ACCEPTED, CUSTOMER_ARRIVED, OUT_FOR_DELIVERY) remain valid.

do $$ begin
  create type public.customer_presence as enum (
    'none',
    'on_the_way',
    'outside',
    'claimed_received'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.orders
  add column if not exists customer_presence public.customer_presence
    not null default 'none';

alter table public.orders
  add column if not exists customer_presence_updated_at timestamptz;

-- Backfill from existing flags/statuses without rewriting status enum values.
update public.orders
set
  customer_presence = case
    when status = 'CUSTOMER_ARRIVED' then 'outside'::public.customer_presence
    when status = 'OUT_FOR_DELIVERY' then 'outside'::public.customer_presence
    when status = 'DELIVERED' then 'claimed_received'::public.customer_presence
    when customer_on_the_way = true then 'on_the_way'::public.customer_presence
    else 'none'::public.customer_presence
  end,
  customer_presence_updated_at = coalesce(
    customer_arrived_at,
    on_my_way_at,
    updated_at
  )
where customer_presence = 'none'
  and (
    customer_on_the_way = true
    or status in ('CUSTOMER_ARRIVED', 'OUT_FOR_DELIVERY', 'DELIVERED')
  );

create index if not exists orders_customer_presence_idx
  on public.orders (customer_presence)
  where status in ('READY', 'CUSTOMER_ARRIVED', 'OUT_FOR_DELIVERY');
