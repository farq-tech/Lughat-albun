import { priceCart, canCheckout } from "@/domains/cart/pricing";
import { getPaymentProvider } from "@/domains/payments/mock-provider";
import { estimatePrepRange } from "@/domains/store/availability";
import {
  generateOpaqueToken,
  generateOrderAccessToken,
  hashToken,
} from "@/lib/auth/customer-token";
import { log, newRequestId } from "@/lib/logging";
import { rateLimit } from "@/lib/rate-limit";
import {
  toDbPaymentMethod,
  type CheckoutInput,
} from "@/lib/validation/checkout";
import { createServiceClient } from "@/lib/supabase/server";
import { buildPricingCatalog } from "./menu";
import { getStoreAvailability } from "./store";

export class DomainError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export async function createCheckoutAndPay(input: {
  checkout: CheckoutInput;
  anonymousToken?: string | null;
  requestKey: string;
}) {
  const requestId = newRequestId();
  const rl = rateLimit(`checkout:${input.requestKey}`, 20, 60_000);
  if (!rl.ok) {
    throw new DomainError("RATE_LIMITED", "حاول مرة ثانية بعد شوي");
  }

  const { availability, store } = await getStoreAvailability();
  if (!availability.available || !store) {
    throw new DomainError("CAR_PICKUP_UNAVAILABLE", availability.message);
  }

  const supabase = createServiceClient();

  // Idempotent replay
  const { data: existingSession } = await supabase
    .from("checkout_sessions")
    .select("*, orders(*)")
    .eq("idempotency_key", input.checkout.idempotencyKey)
    .maybeSingle();

  if (existingSession?.order_id) {
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", existingSession.order_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return {
      replay: true as const,
      orderId: existingSession.order_id as string,
      publicOrderNumber: existingSession.orders?.public_order_number as number,
      accessToken: null as string | null,
      paymentStatus: payment?.status ?? "PENDING",
      redirectUrl: null as string | null,
    };
  }

  const catalog = await buildPricingCatalog();
  const priced = priceCart(
    input.checkout.items,
    catalog,
    input.checkout.clientTotalMinor,
  );

  // Sold out only when admin toggled is_available=false — never auto-decrements.
  if (priced.totals.unavailableItems.length > 0) {
    throw new DomainError(
      "ITEM_UNAVAILABLE",
      "أحد المنتجات غير متوفر أو تغيّر من المنيو — امسح السلة وأعد الطلب.",
      { unavailableItems: priced.totals.unavailableItems, cart: priced },
    );
  }

  if (priced.totals.invalidItems.length > 0) {
    throw new DomainError(
      "CART_INVALID",
      "بعض المنتجات في السلة قديمة أو خياراتها تغيّرت — امسح السلة وأعد الطلب من المنيو.",
      { invalidItems: priced.totals.invalidItems, cart: priced },
    );
  }

  if (priced.totals.priceChanged) {
    throw new DomainError(
      "PRICE_CHANGED",
      "تغير سعر أحد المنتجات",
      { cart: priced },
    );
  }

  if (!canCheckout(priced)) {
    throw new DomainError("CART_INVALID", "السلة غير جاهزة للدفع");
  }

  // Resolve anonymous customer
  let anonymousToken = input.anonymousToken;
  let anonymousCustomerId: string | null = null;
  if (!anonymousToken) {
    anonymousToken = generateOpaqueToken();
  }
  const tokenHash = hashToken(anonymousToken);
  const { data: existingCustomer } = await supabase
    .from("anonymous_customers")
    .select("id")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (existingCustomer) {
    anonymousCustomerId = existingCustomer.id;
    await supabase
      .from("anonymous_customers")
      .update({
        phone: input.checkout.phone,
        first_name: input.checkout.firstName ?? null,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", anonymousCustomerId);
  } else {
    const { data: created, error } = await supabase
      .from("anonymous_customers")
      .insert({
        token_hash: tokenHash,
        phone: input.checkout.phone,
        first_name: input.checkout.firstName ?? null,
      })
      .select("id")
      .single();
    if (error) throw new DomainError("CUSTOMER_CREATE_FAILED", "صار خطأ، حاول مرة ثانية");
    anonymousCustomerId = created.id;
  }

  // Vehicle
  let vehicleSnapshot = {
    make_model: "",
    color: "",
    plate_hint: null as string | null,
    vehicle_id: null as string | null,
  };

  if (input.checkout.vehicleId) {
    const { data: vehicle } = await supabase
      .from("customer_vehicles")
      .select("*")
      .eq("id", input.checkout.vehicleId)
      .eq("anonymous_customer_id", anonymousCustomerId)
      .maybeSingle();
    if (!vehicle) throw new DomainError("VEHICLE_NOT_FOUND", "ما لقينا السيارة المحفوظة");
    vehicleSnapshot = {
      make_model: vehicle.make_model,
      color: vehicle.color,
      plate_hint: vehicle.plate_hint,
      vehicle_id: vehicle.id,
    };
  } else if (input.checkout.vehicle) {
    const v = input.checkout.vehicle;
    const { data: saved, error } = await supabase
      .from("customer_vehicles")
      .insert({
        anonymous_customer_id: anonymousCustomerId,
        make_model: v.makeModel,
        color: v.color,
        plate_hint: v.plateHint ?? null,
        is_default: true,
      })
      .select("*")
      .single();
    if (error) throw new DomainError("VEHICLE_SAVE_FAILED", "ما قدرنا نحفظ السيارة");
    vehicleSnapshot = {
      make_model: saved.make_model,
      color: saved.color,
      plate_hint: saved.plate_hint,
      vehicle_id: saved.id,
    };
  }

  // Prep estimate
  const { count: preparingCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .in("status", ["ACCEPTED", "PREPARING"]);

  const estimate = estimatePrepRange({
    basePrepMinutes: store.base_prep_minutes,
    activePreparingOrders: preparingCount ?? 0,
  });

  const accessToken = generateOrderAccessToken();
  const accessTokenHash = hashToken(accessToken);

  // Public order number via DB sequence
  const { data: nextNum } = await supabase.rpc("next_order_number");
  let publicOrderNumber =
    typeof nextNum === "number" ? nextNum : Number(nextNum);
  if (!Number.isFinite(publicOrderNumber) || publicOrderNumber < 1) {
    const { count } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true });
    publicOrderNumber = (count ?? 0) + 1;
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      public_order_number: publicOrderNumber,
      anonymous_customer_id: anonymousCustomerId,
      access_token_hash: accessTokenHash,
      customer_name: input.checkout.firstName ?? null,
      phone: input.checkout.phone,
      status: "PENDING_PAYMENT",
      vehicle_id: vehicleSnapshot.vehicle_id,
      car_make_model_snapshot: vehicleSnapshot.make_model || null,
      car_color_snapshot: vehicleSnapshot.color || null,
      plate_hint_snapshot: vehicleSnapshot.plate_hint,
      subtotal_minor: priced.totals.subtotalMinor,
      tax_amount_minor: priced.totals.taxAmountMinor,
      service_fee_minor: priced.totals.serviceFeeMinor,
      total_minor: priced.totals.totalMinor,
      currency: priced.totals.currency,
      source: input.checkout.source,
      payment_status: "PENDING",
      payment_method: toDbPaymentMethod(
        input.checkout.paymentMethod ?? "cash_on_delivery",
      ),
      estimated_prep_min: estimate.min,
      estimated_prep_max: estimate.max,
      idempotency_key: input.checkout.idempotencyKey,
    })
    .select("*")
    .single();

  if (orderError || !order) {
    if (orderError?.code === "23505") {
      // unique idempotency — replay
      const { data: replay } = await supabase
        .from("orders")
        .select("*")
        .eq("idempotency_key", input.checkout.idempotencyKey)
        .single();
      return {
        replay: true as const,
        orderId: replay.id,
        publicOrderNumber: replay.public_order_number,
        accessToken: null,
        paymentStatus: replay.payment_status,
        redirectUrl: null,
        anonymousToken,
      };
    }
    log({
      requestId,
      event: "order_create_failed",
      level: "error",
      error: orderError?.message,
    });
    throw new DomainError("ORDER_CREATE_FAILED", "صار خطأ، حاول مرة ثانية");
  }

  // Items snapshots
  for (const line of priced.lines.filter((l) => l.available)) {
    const { data: item, error: itemError } = await supabase
      .from("order_items")
      .insert({
        order_id: order.id,
        product_id: line.productId,
        product_name_snapshot: line.productName,
        unit_price_minor: line.unitPriceMinor,
        quantity: line.quantity,
        line_total_minor: line.lineTotalMinor,
      })
      .select("id")
      .single();
    if (itemError || !item) continue;
    if (line.modifiers.length) {
      await supabase.from("order_item_modifiers").insert(
        line.modifiers.map((m) => ({
          order_item_id: item.id,
          modifier_option_id: m.optionId,
          group_name_snapshot: m.groupName,
          option_name_snapshot: m.optionName,
          price_delta_minor: m.priceDeltaMinor,
        })),
      );
    }
  }

  await supabase.from("order_events").insert({
    order_id: order.id,
    event_type: "ORDER_CREATED",
    from_status: null,
    to_status: "PENDING_PAYMENT",
    actor_type: "CUSTOMER",
    metadata: { source: input.checkout.source },
  });

  await supabase.from("checkout_sessions").insert({
    idempotency_key: input.checkout.idempotencyKey,
    anonymous_customer_id: anonymousCustomerId,
    cart_snapshot: priced.lines,
    totals_snapshot: priced.totals,
    phone: input.checkout.phone,
    customer_name: input.checkout.firstName ?? null,
    vehicle_snapshot: vehicleSnapshot,
    source: input.checkout.source,
    order_id: order.id,
    status: "ORDER_CREATED",
  });

  const paymentIdempotency = `pay_${input.checkout.idempotencyKey}`;
  const dbPaymentMethod = toDbPaymentMethod(
    input.checkout.paymentMethod ?? "cash_on_delivery",
  );
  const isCashOnDelivery = dbPaymentMethod === "CASH_ON_DELIVERY";

  const { data: existingPayment } = await supabase
    .from("payments")
    .select("*")
    .eq("idempotency_key", paymentIdempotency)
    .maybeSingle();

  if (
    existingPayment?.status === "PAID" ||
    (isCashOnDelivery &&
      existingPayment?.provider === "cash_on_delivery" &&
      order.status !== "PENDING_PAYMENT")
  ) {
    return {
      replay: true as const,
      orderId: order.id,
      publicOrderNumber: order.public_order_number,
      accessToken,
      paymentStatus: isCashOnDelivery ? "COD_CONFIRMED" : "PAID",
      paymentMethod: dbPaymentMethod,
      redirectUrl: null,
      anonymousToken,
    };
  }

  if (isCashOnDelivery) {
    const providerPaymentId = `cod_${order.id}`;
    const { error: paymentError } = await supabase.from("payments").upsert(
      {
        order_id: order.id,
        provider: "cash_on_delivery",
        provider_payment_id: providerPaymentId,
        status: "PENDING",
        amount_minor: order.total_minor,
        currency: order.currency,
        idempotency_key: paymentIdempotency,
        raw_safe_metadata: { method: "CASH_ON_DELIVERY" },
        verified_at: null,
      },
      { onConflict: "idempotency_key" },
    );

    if (paymentError) {
      log({
        requestId,
        orderId: order.id,
        event: "cod_payment_row_failed",
        level: "error",
        error: paymentError.message,
      });
      throw new DomainError("ORDER_CREATE_FAILED", "صار خطأ، حاول مرة ثانية");
    }

    await markOrderPaid({
      orderId: order.id,
      expectedStatus: "PENDING_PAYMENT",
      providerPaymentId,
      actorType: "SYSTEM",
      eventType: "COD_CONFIRMED",
      markPaymentPaid: false,
    });

    log({
      requestId,
      orderId: order.id,
      publicOrderNumber: order.public_order_number,
      event: "checkout_cod_confirmed",
    });

    return {
      replay: false as const,
      orderId: order.id,
      publicOrderNumber: order.public_order_number,
      accessToken,
      paymentStatus: "COD_CONFIRMED" as const,
      paymentMethod: dbPaymentMethod,
      redirectUrl: null,
      anonymousToken,
      estimatedPrepMin: estimate.min,
      estimatedPrepMax: estimate.max,
    };
  }

  const provider = getPaymentProvider();
  const paymentResult = await provider.createPayment({
    orderId: order.id,
    amountMinor: order.total_minor,
    currency: order.currency,
    idempotencyKey: paymentIdempotency,
    customerPhone: input.checkout.phone,
    returnUrl: `${process.env.APP_URL ?? "http://localhost:3000"}/order/${order.public_order_number}`,
    simulate: input.checkout.paymentSimulate ?? "success",
  });

  const { data: paymentRow, error: paymentError } = await supabase
    .from("payments")
    .upsert(
      {
        order_id: order.id,
        provider: paymentResult.provider,
        provider_payment_id: paymentResult.providerPaymentId,
        status: paymentResult.status === "PAID" ? "PAID" : "PENDING",
        amount_minor: order.total_minor,
        currency: order.currency,
        idempotency_key: paymentIdempotency,
        raw_safe_metadata: {
          redirectUrl: paymentResult.redirectUrl,
          method: dbPaymentMethod,
        },
        verified_at:
          paymentResult.status === "PAID" ? new Date().toISOString() : null,
      },
      { onConflict: "idempotency_key" },
    )
    .select("*")
    .single();

  if (paymentError) {
    log({
      requestId,
      orderId: order.id,
      event: "payment_row_failed",
      level: "error",
      error: paymentError.message,
    });
  }

  if (paymentResult.status === "PAID") {
    await markOrderPaid({
      orderId: order.id,
      expectedStatus: "PENDING_PAYMENT",
      providerPaymentId: paymentResult.providerPaymentId,
      actorType: "PAYMENT_PROVIDER",
    });
  } else if (paymentResult.status === "FAILED" || paymentResult.status === "CANCELLED") {
    throw new DomainError(
      "PAYMENT_FAILED",
      "صار خطأ في الدفع، ما انخصم منك شيء.",
      { payment: paymentRow },
    );
  }

  log({
    requestId,
    orderId: order.id,
    publicOrderNumber: order.public_order_number,
    event: "checkout_completed",
  });

  return {
    replay: false as const,
    orderId: order.id,
    publicOrderNumber: order.public_order_number,
    accessToken,
    paymentStatus: paymentResult.status,
    paymentMethod: dbPaymentMethod,
    redirectUrl: paymentResult.redirectUrl ?? null,
    anonymousToken,
    estimatedPrepMin: estimate.min,
    estimatedPrepMax: estimate.max,
  };
}

export async function markOrderPaid(input: {
  orderId: string;
  expectedStatus: "PENDING_PAYMENT";
  providerPaymentId: string;
  actorType: "PAYMENT_PROVIDER" | "SYSTEM";
  eventType?: string;
  markPaymentPaid?: boolean;
}) {
  const supabase = createServiceClient();
  const markPaymentPaid = input.markPaymentPaid !== false;

  // Idempotent: already paid
  const { data: current } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", input.orderId)
    .single();

  if (!current) throw new DomainError("ORDER_NOT_FOUND", "الطلب غير موجود");
  if (current.status !== "PENDING_PAYMENT") {
    if (current.status === "PAID" || [
      "ACCEPTED",
      "PREPARING",
      "READY",
      "CUSTOMER_ARRIVED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
    ].includes(current.status)) {
      return { ok: true as const, idempotent: true };
    }
    throw new DomainError("INVALID_TRANSITION", "ما نقدر نأكد الدفع لهالحالة");
  }

  const { data, error } = await supabase.rpc("transition_order", {
    p_order_id: input.orderId,
    p_from_status: "PENDING_PAYMENT",
    p_to_status: "PAID",
    p_event_type: input.eventType ?? "PAYMENT_CONFIRMED",
    p_actor_type: input.actorType,
    p_actor_id: null,
    p_metadata: { providerPaymentId: input.providerPaymentId },
  });

  if (error) {
    if (error.message?.includes("ORDER_TRANSITION_CONFLICT")) {
      return { ok: true as const, idempotent: true };
    }
    throw new DomainError("TRANSITION_FAILED", "فشل تأكيد الدفع");
  }

  if (markPaymentPaid) {
    await supabase
      .from("payments")
      .update({
        status: "PAID",
        verified_at: new Date().toISOString(),
      })
      .eq("order_id", input.orderId)
      .eq("provider_payment_id", input.providerPaymentId);
  }

  return { ok: true as const, order: data, idempotent: false };
}
