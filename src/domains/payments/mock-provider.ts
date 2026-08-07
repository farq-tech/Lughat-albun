import { createHmac, randomUUID } from "crypto";
import {
  PaymentProviderError,
  type CreatePaymentInput,
  type CreatePaymentResult,
  type PaymentProvider,
  type RefundInput,
  type VerifyPaymentInput,
  type VerifyPaymentResult,
  type WebhookResult,
} from "./provider";

interface MockRecord {
  id: string;
  orderId: string;
  amountMinor: number;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
  simulate: NonNullable<CreatePaymentInput["simulate"]>;
  createdAt: number;
}

const store = new Map<string, MockRecord>();

export function resetMockPayments() {
  store.clear();
}

export function getMockPayment(id: string) {
  return store.get(id);
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  constructor(
    private readonly webhookSecret = process.env.MOCK_PAYMENT_WEBHOOK_SECRET ?? "mock-secret",
    private readonly nodeEnv = process.env.NODE_ENV ?? "development",
    private readonly allowInProduction =
      process.env.ALLOW_MOCK_PAYMENTS_IN_PRODUCTION === "true",
  ) {}

  private assertAllowed() {
    if (this.nodeEnv === "production" && !this.allowInProduction) {
      throw new PaymentProviderError(
        "Mock payment provider is not allowed in production",
        "FORBIDDEN_IN_PRODUCTION",
      );
    }
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    this.assertAllowed();
    const id = `mock_${randomUUID()}`;
    const simulate = input.simulate ?? "success";
    const status =
      simulate === "failure"
        ? "FAILED"
        : simulate === "cancel"
          ? "CANCELLED"
          : "PENDING";

    store.set(id, {
      id,
      orderId: input.orderId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      status,
      simulate,
      createdAt: Date.now(),
    });

    if (simulate === "success") {
      // Immediate success path for local UX; webhook can still duplicate later.
      const rec = store.get(id)!;
      rec.status = "PAID";
    }

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    return {
      provider: this.name,
      providerPaymentId: id,
      status: store.get(id)!.status,
      redirectUrl: `${appUrl}/api/payments/mock/return?paymentId=${id}&orderId=${input.orderId}`,
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    this.assertAllowed();
    const rec = store.get(input.providerPaymentId);
    if (!rec) {
      throw new PaymentProviderError("Payment not found", "NOT_FOUND");
    }
    if (rec.amountMinor !== input.expectedAmountMinor) {
      throw new PaymentProviderError("Amount mismatch", "AMOUNT_MISMATCH");
    }
    if (rec.currency !== input.expectedCurrency) {
      throw new PaymentProviderError("Currency mismatch", "CURRENCY_MISMATCH");
    }
    return {
      providerPaymentId: rec.id,
      status: rec.status,
      amountMinor: rec.amountMinor,
      currency: rec.currency,
      rawSafeMetadata: { orderId: rec.orderId, simulate: rec.simulate },
    };
  }

  async handleWebhook(headers: Headers, body: string): Promise<WebhookResult> {
    this.assertAllowed();
    const signature = headers.get("x-mock-signature") ?? "";
    const expected = createHmac("sha256", this.webhookSecret)
      .update(body)
      .digest("hex");
    if (signature !== expected) {
      throw new PaymentProviderError("Invalid webhook signature", "INVALID_SIGNATURE");
    }
    const payload = JSON.parse(body) as {
      eventId: string;
      providerPaymentId: string;
      status: "PAID" | "FAILED" | "CANCELLED";
      amountMinor: number;
      currency: string;
    };
    const rec = store.get(payload.providerPaymentId);
    if (rec) {
      rec.status = payload.status;
    }
    return {
      providerPaymentId: payload.providerPaymentId,
      status: payload.status,
      amountMinor: payload.amountMinor,
      currency: payload.currency,
      eventId: payload.eventId,
      rawSafeMetadata: { source: "webhook" },
    };
  }

  async refundPayment(input: RefundInput): Promise<{ status: "REFUNDED" }> {
    this.assertAllowed();
    const rec = store.get(input.providerPaymentId);
    if (!rec) throw new PaymentProviderError("Payment not found", "NOT_FOUND");
    rec.status = "CANCELLED";
    return { status: "REFUNDED" };
  }

  /** Test helper: forge signed webhook body */
  signWebhook(body: string): string {
    return createHmac("sha256", this.webhookSecret).update(body).digest("hex");
  }
}

export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER ?? "mock";
  if (provider === "mock") return new MockPaymentProvider();
  // Future: Moyasar / Tap / HyperPay
  throw new Error(`Unsupported payment provider: ${provider}`);
}
