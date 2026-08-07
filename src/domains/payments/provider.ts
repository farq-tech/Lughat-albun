export type PaymentIntentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELLED";

export interface CreatePaymentInput {
  orderId: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
  customerPhone?: string;
  returnUrl: string;
  metadata?: Record<string, string>;
  /** Mock-only simulation knobs */
  simulate?: "success" | "failure" | "cancel" | "delayed";
}

export interface CreatePaymentResult {
  provider: string;
  providerPaymentId: string;
  status: PaymentIntentStatus;
  redirectUrl?: string;
  clientSecret?: string;
}

export interface VerifyPaymentInput {
  providerPaymentId: string;
  expectedAmountMinor: number;
  expectedCurrency: string;
}

export interface VerifyPaymentResult {
  providerPaymentId: string;
  status: PaymentIntentStatus;
  amountMinor: number;
  currency: string;
  rawSafeMetadata: Record<string, unknown>;
}

export interface WebhookResult {
  providerPaymentId: string;
  status: PaymentIntentStatus;
  amountMinor: number;
  currency: string;
  eventId: string;
  rawSafeMetadata: Record<string, unknown>;
}

export interface RefundInput {
  providerPaymentId: string;
  amountMinor: number;
  idempotencyKey: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
  handleWebhook(
    headers: Headers,
    body: string,
  ): Promise<WebhookResult>;
  refundPayment(input: RefundInput): Promise<{ status: "REFUNDED" }>;
}

export class PaymentProviderError extends Error {
  constructor(
    message: string,
    public code:
      | "INVALID_SIGNATURE"
      | "AMOUNT_MISMATCH"
      | "CURRENCY_MISMATCH"
      | "NOT_FOUND"
      | "FORBIDDEN_IN_PRODUCTION"
      | "PROVIDER_ERROR",
  ) {
    super(message);
    this.name = "PaymentProviderError";
  }
}
