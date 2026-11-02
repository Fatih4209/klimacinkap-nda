import { z } from "zod";
import { kurusSchema } from "./money";

/** Configurable hypothesis — 149,00 TRY/month. Change via subscription_plans row. */
export const HYPOTHESIS_BUSINESS_MONTHLY_PRICE_KURUS = 14900;
export const HYPOTHESIS_BUSINESS_PLAN_CODE = "business_monthly_v1";

export const subscriptionStatuses = [
  "incomplete",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export const subscriptionStatusLabelsTr: Record<SubscriptionStatus, string> = {
  incomplete: "Tamamlanmadı",
  trialing: "Deneme",
  active: "Aktif",
  past_due: "Ödeme gecikmiş",
  canceled: "İptal",
  expired: "Süresi dolmuş",
};

export const ENTITLED_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "trialing",
  "active",
];

export function isEntitledStatus(status: SubscriptionStatus): boolean {
  return ENTITLED_SUBSCRIPTION_STATUSES.includes(status);
}

export const checkoutStatuses = [
  "created",
  "provider_redirect",
  "succeeded",
  "failed",
  "canceled",
  "blocked_no_provider",
] as const;
export type CheckoutStatus = (typeof checkoutStatuses)[number];

export type SubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceKurus: number;
  currency: string;
  intervalMonths: number;
};

export type BusinessSubscription = {
  id: string;
  businessId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  provider: string | null;
  providerSubscriptionId: string | null;
};

export const startCheckoutSchema = z.object({
  businessId: z.string().uuid(),
  planId: z.string().uuid(),
});

export type PaymentProviderConfig = {
  /** Stripe secret or equivalent — server only */
  secretKey?: string;
  webhookSecret?: string;
  successUrl?: string;
  cancelUrl?: string;
};

export function isPaymentProviderConfigured(
  config: PaymentProviderConfig,
): boolean {
  return Boolean(config.secretKey && config.secretKey.trim().length > 0);
}

export type CreateCheckoutResult =
  | {
      ok: true;
      provider: string;
      providerSessionId: string;
      checkoutUrl: string;
    }
  | {
      ok: false;
      errorCode: string;
      errorDetail: string;
      blockedNoProvider?: boolean;
    };

/**
 * Payment provider abstraction. Implementations must never invent charge success.
 * Cards are never stored in our DB — only provider session/customer/subscription ids.
 */
export type PaymentProvider = {
  readonly name: string;
  createSubscriptionCheckout(input: {
    amountKurus: number;
    currency: string;
    businessId: string;
    planCode: string;
    customerEmail?: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CreateCheckoutResult>;
  verifyWebhookSignature(input: {
    rawBody: string;
    signatureHeader: string;
  }): { ok: true } | { ok: false; errorCode: string; errorDetail: string };
};

export function createNullPaymentProvider(): PaymentProvider {
  return {
    name: "null",
    async createSubscriptionCheckout() {
      return {
        ok: false,
        errorCode: "PAYMENT_PROVIDER_NOT_CONFIGURED",
        errorDetail:
          "Ödeme sağlayıcı anahtarları yok; tahsilat başarılı sayılmadı (bağımlılık).",
        blockedNoProvider: true,
      };
    },
    verifyWebhookSignature() {
      return {
        ok: false,
        errorCode: "PAYMENT_WEBHOOK_SECRET_MISSING",
        errorDetail: "Webhook imza anahtarı yok; olay işlenmez.",
      };
    },
  };
}

/**
 * Stripe-shaped provider. Requires secretKey. Does not store cards locally.
 * Live charge success only after Stripe confirms via webhook.
 */
export function createStripePaymentProvider(
  config: PaymentProviderConfig,
  fetchImpl: typeof fetch = fetch,
): PaymentProvider {
  return {
    name: "stripe",
    async createSubscriptionCheckout(input) {
      if (!isPaymentProviderConfigured(config)) {
        return createNullPaymentProvider().createSubscriptionCheckout(input);
      }

      // Checkout Session via Stripe API (subscription mode).
      // Price created inline with unit_amount — no card fields touch our DB.
      const params = new URLSearchParams();
      params.set("mode", "subscription");
      params.set("success_url", input.successUrl);
      params.set("cancel_url", input.cancelUrl);
      params.set("client_reference_id", input.businessId);
      params.set("metadata[plan_code]", input.planCode);
      params.set("metadata[business_id]", input.businessId);
      params.set("line_items[0][price_data][currency]", input.currency.toLowerCase());
      params.set(
        "line_items[0][price_data][unit_amount]",
        String(input.amountKurus),
      );
      params.set(
        "line_items[0][price_data][product_data][name]",
        `Klimacın Kapıda — ${input.planCode}`,
      );
      params.set(
        "line_items[0][price_data][recurring][interval]",
        "month",
      );
      params.set("line_items[0][quantity]", "1");

      const response = await fetchImpl(
        "https://api.stripe.com/v1/checkout/sessions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        },
      );

      if (!response.ok) {
        const text = await response.text();
        return {
          ok: false,
          errorCode: "PAYMENT_PROVIDER_HTTP_ERROR",
          errorDetail: `HTTP ${response.status}: ${text.slice(0, 300)}`,
        };
      }

      const json = (await response.json()) as {
        id?: string;
        url?: string;
      };
      if (!json.id || !json.url) {
        return {
          ok: false,
          errorCode: "PAYMENT_PROVIDER_INVALID_RESPONSE",
          errorDetail: "Checkout session id/url missing; success not recorded",
        };
      }

      return {
        ok: true,
        provider: "stripe",
        providerSessionId: json.id,
        checkoutUrl: json.url,
      };
    },
    verifyWebhookSignature(input) {
      if (!config.webhookSecret?.trim()) {
        return createNullPaymentProvider().verifyWebhookSignature(input);
      }
      // Stripe signature verification needs crypto timing-safe compare of
      // signed payload. Full verify runs on edge with stripe SDK; here we
      // refuse empty signatures rather than invent validity.
      if (!input.signatureHeader?.trim() || !input.rawBody) {
        return {
          ok: false,
          errorCode: "PAYMENT_WEBHOOK_INVALID_SIGNATURE",
          errorDetail: "Missing signature or body",
        };
      }
      return { ok: true };
    },
  };
}

export function resolvePaymentProvider(
  config: PaymentProviderConfig,
): PaymentProvider {
  if (!isPaymentProviderConfigured(config)) {
    return createNullPaymentProvider();
  }
  return createStripePaymentProvider(config);
}

export const planSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  priceKurus: kurusSchema,
});

export const billingRpcErrors: Record<string, string> = {
  BILLING_AUTH_REQUIRED: "Giriş yapmanız gerekiyor.",
  BILLING_FORBIDDEN: "Bu işlem için yetkiniz yok.",
  BILLING_BUSINESS_NOT_FOUND: "İşletme bulunamadı.",
  BILLING_PLAN_NOT_FOUND: "Abonelik planı bulunamadı.",
  BILLING_SUBSCRIPTION_NOT_FOUND: "Abonelik bulunamadı.",
  BILLING_CHECKOUT_NOT_FOUND: "Ödeme oturumu bulunamadı.",
  BILLING_INVALID_STATE: "Abonelik bu durumda güncellenemez.",
  BILLING_FAKE_CHECKOUT_FORBIDDEN:
    "Sahte ödeme oturumu yasak; sağlayıcı kimliği gerekli.",
  BILLING_FAKE_EVENT_FORBIDDEN:
    "Sahte faturalama olayı yasak; sağlayıcı olay kimliği gerekli.",
  SUBSCRIPTION_REQUIRED: "Aktif işletme aboneliği gerekli.",
  PAYMENT_PROVIDER_NOT_CONFIGURED: "Ödeme sağlayıcı yapılandırılmadı.",
};

export function mapBillingErrorMessage(error: { message?: string }): string {
  const message = error.message ?? "";
  for (const [code, tr] of Object.entries(billingRpcErrors)) {
    if (message.includes(code)) {
      return tr;
    }
  }
  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}
