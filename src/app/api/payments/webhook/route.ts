import { PaymentProviderError } from "@/domains/payments/provider";
import { getPaymentProvider } from "@/domains/payments/mock-provider";
import { markOrderPaid } from "@/server/services/checkout";
import { createServiceClient } from "@/lib/supabase/server";
import { log, newRequestId } from "@/lib/logging";

export async function POST(request: Request) {
  const requestId = newRequestId();
  const body = await request.text();

  try {
    const provider = getPaymentProvider();
    const result = await provider.handleWebhook(request.headers, body);

    log({
      requestId,
      event: "payment_webhook_received",
      providerPaymentId: result.providerPaymentId,
      status: result.status,
      eventId: result.eventId,
    });

    if (result.status !== "PAID") {
      return Response.json({ ok: true, processed: false, status: result.status });
    }

    const supabase = createServiceClient();
    const { data: payment } = await supabase
      .from("payments")
      .select("order_id, amount_minor, currency, status")
      .eq("provider_payment_id", result.providerPaymentId)
      .maybeSingle();

    if (!payment) {
      log({
        requestId,
        event: "payment_webhook_orphan",
        providerPaymentId: result.providerPaymentId,
      });
      return Response.json({ ok: true, processed: false, reason: "payment_not_found" });
    }

    if (
      payment.amount_minor !== result.amountMinor ||
      payment.currency !== result.currency
    ) {
      return Response.json(
        { ok: false, error: "amount_mismatch" },
        { status: 400 },
      );
    }

    const paid = await markOrderPaid({
      orderId: payment.order_id,
      expectedStatus: "PENDING_PAYMENT",
      providerPaymentId: result.providerPaymentId,
      actorType: "PAYMENT_PROVIDER",
    });

    return Response.json({
      ok: true,
      processed: true,
      idempotent: paid.idempotent ?? false,
    });
  } catch (e) {
    if (e instanceof PaymentProviderError) {
      if (e.code === "INVALID_SIGNATURE") {
        return Response.json({ ok: false, error: "invalid_signature" }, { status: 401 });
      }
      return Response.json({ ok: false, error: e.code }, { status: 400 });
    }

    log({
      requestId,
      event: "payment_webhook_error",
      error: e instanceof Error ? e.message : "unknown",
    });

    return Response.json({ ok: false, error: "internal" }, { status: 500 });
  }
}
