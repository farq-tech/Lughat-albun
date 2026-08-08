-- Non-destructive: track how the customer chose to pay.
-- Kitchen still uses order.status=PAID for confirmed COD orders;
-- staff UI distinguishes COD via payment_method (not payment_status alone).

do $$ begin
  create type public.payment_method as enum (
    'ELECTRONIC',
    'APPLE_PAY',
    'MADA',
    'VISA',
    'MASTERCARD',
    'CASH_ON_DELIVERY'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.orders
  add column if not exists payment_method public.payment_method
    not null default 'ELECTRONIC';

comment on column public.orders.payment_method is
  'How the customer intends to pay. CASH_ON_DELIVERY skips online capture.';

create index if not exists orders_payment_method_idx
  on public.orders (payment_method)
  where payment_method = 'CASH_ON_DELIVERY';
