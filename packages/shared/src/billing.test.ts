import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createNullPaymentProvider,
  createStripePaymentProvider,
  HYPOTHESIS_BUSINESS_MONTHLY_PRICE_KURUS,
  isEntitledStatus,
  isPaymentProviderConfigured,
  mapBillingErrorMessage,
} from "./billing.js";

test("hypothesis monthly price is 14900 kuruş", () => {
  assert.equal(HYPOTHESIS_BUSINESS_MONTHLY_PRICE_KURUS, 14900);
});

test("only trialing/active are entitled", () => {
  assert.equal(isEntitledStatus("active"), true);
  assert.equal(isEntitledStatus("trialing"), true);
  assert.equal(isEntitledStatus("past_due"), false);
  assert.equal(isEntitledStatus("canceled"), false);
  assert.equal(isEntitledStatus("incomplete"), false);
});

test("null provider never claims checkout success", async () => {
  const provider = createNullPaymentProvider();
  const result = await provider.createSubscriptionCheckout({
    amountKurus: 14900,
    currency: "TRY",
    businessId: "11111111-1111-1111-1111-111111111111",
    planCode: "business_monthly_v1",
    successUrl: "https://example.com/ok",
    cancelUrl: "https://example.com/cancel",
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.blockedNoProvider, true);
    assert.equal(result.errorCode, "PAYMENT_PROVIDER_NOT_CONFIGURED");
  }
});

test("stripe provider without key delegates to null behavior", async () => {
  assert.equal(isPaymentProviderConfigured({}), false);
  const provider = createStripePaymentProvider({});
  const result = await provider.createSubscriptionCheckout({
    amountKurus: 14900,
    currency: "TRY",
    businessId: "11111111-1111-1111-1111-111111111111",
    planCode: "business_monthly_v1",
    successUrl: "https://example.com/ok",
    cancelUrl: "https://example.com/cancel",
  });
  assert.equal(result.ok, false);
});

test("stripe provider returns session only with real id+url", async () => {
  const provider = createStripePaymentProvider(
    { secretKey: "sk_test_x" },
    async () =>
      new Response(JSON.stringify({ id: "cs_test_1", url: "https://pay.example/cs" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );
  const result = await provider.createSubscriptionCheckout({
    amountKurus: 14900,
    currency: "TRY",
    businessId: "11111111-1111-1111-1111-111111111111",
    planCode: "business_monthly_v1",
    successUrl: "https://example.com/ok",
    cancelUrl: "https://example.com/cancel",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.providerSessionId, "cs_test_1");
    assert.equal(result.checkoutUrl, "https://pay.example/cs");
  }
});

test("stripe webhook verify never claims ok without crypto wiring", () => {
  const provider = createStripePaymentProvider({
    secretKey: "sk_test_x",
    webhookSecret: "whsec_test",
  });
  const result = provider.verifyWebhookSignature({
    rawBody: "{}",
    signatureHeader: "t=1,v1=abc",
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.errorCode, "PAYMENT_WEBHOOK_VERIFY_NOT_WIRED");
  }
});

test("maps subscription required error", () => {
  assert.match(
    mapBillingErrorMessage({ message: "SUBSCRIPTION_REQUIRED" }),
    /aboneliği gerekli/i,
  );
});
