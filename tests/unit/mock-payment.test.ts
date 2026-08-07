import { describe, expect, it, beforeEach } from "vitest";
import {
  MockPaymentProvider,
  resetMockPayments,
} from "@/domains/payments/mock-provider";
import { PaymentProviderError } from "@/domains/payments/provider";

describe("MockPaymentProvider", () => {
  beforeEach(() => {
    resetMockPayments();
  });

  it("creates and verifies successful payment", async () => {
    const provider = new MockPaymentProvider("secret", "test");
    const created = await provider.createPayment({
      orderId: "o1",
      amountMinor: 2990,
      currency: "SAR",
      idempotencyKey: "k1",
      returnUrl: "http://localhost/return",
      simulate: "success",
    });
    expect(created.status).toBe("PAID");
    const verified = await provider.verifyPayment({
      providerPaymentId: created.providerPaymentId,
      expectedAmountMinor: 2990,
      expectedCurrency: "SAR",
    });
    expect(verified.status).toBe("PAID");
  });

  it("rejects invalid webhook signature", async () => {
    const provider = new MockPaymentProvider("secret", "test");
    const body = JSON.stringify({
      eventId: "e1",
      providerPaymentId: "x",
      status: "PAID",
      amountMinor: 100,
      currency: "SAR",
    });
    await expect(
      provider.handleWebhook(new Headers({ "x-mock-signature": "bad" }), body),
    ).rejects.toBeInstanceOf(PaymentProviderError);
  });

  it("accepts duplicate signed webhooks idempotently at provider layer", async () => {
    const provider = new MockPaymentProvider("secret", "test");
    const created = await provider.createPayment({
      orderId: "o1",
      amountMinor: 1000,
      currency: "SAR",
      idempotencyKey: "k2",
      returnUrl: "http://localhost",
      simulate: "delayed",
    });
    const body = JSON.stringify({
      eventId: "evt_dup",
      providerPaymentId: created.providerPaymentId,
      status: "PAID",
      amountMinor: 1000,
      currency: "SAR",
    });
    const sig = provider.signWebhook(body);
    const a = await provider.handleWebhook(
      new Headers({ "x-mock-signature": sig }),
      body,
    );
    const b = await provider.handleWebhook(
      new Headers({ "x-mock-signature": sig }),
      body,
    );
    expect(a.status).toBe("PAID");
    expect(b.status).toBe("PAID");
  });

  it("refuses mock in production", async () => {
    const provider = new MockPaymentProvider("secret", "production", false);
    await expect(
      provider.createPayment({
        orderId: "o1",
        amountMinor: 100,
        currency: "SAR",
        idempotencyKey: "k3",
        returnUrl: "http://localhost",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN_IN_PRODUCTION" });
  });
});
