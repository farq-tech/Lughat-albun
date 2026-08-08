-- Staff transitions run via Next.js service_role after requireStaff().
-- Allow service_role; keep auth.uid() checks for direct authenticated RPC calls.

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
  v_role text := coalesce(auth.role(), current_setting('role', true));
begin
  if p_actor_type = 'STAFF' then
    if v_role = 'service_role' then
      null;
    elsif auth.uid() is null or not public.is_staff() then
      raise exception 'FORBIDDEN' using errcode = '42501';
    elsif p_actor_id is distinct from auth.uid() then
      raise exception 'ACTOR_MISMATCH' using errcode = '42501';
    end if;
  end if;

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

grant execute on function public.transition_order(uuid, public.order_status, public.order_status, text, public.actor_type, uuid, jsonb) to service_role, authenticated;
