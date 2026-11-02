import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isPaymentProviderConfigured,
  mapBillingErrorMessage,
  resolvePaymentProvider,
  startCheckoutSchema,
  type BusinessSubscription,
  type CheckoutStatus,
  type PaymentProviderConfig,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from "./billing";

type RpcError = { message?: string };

export type BillingApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail<T>(error: RpcError | string): BillingApiResult<T> {
  if (typeof error === "string") {
    return { ok: false, error };
  }
  return { ok: false, error: mapBillingErrorMessage(error) };
}

function mapPlan(row: Record<string, unknown>): SubscriptionPlan {
  return {
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    priceKurus: row.price_kurus as number,
    currency: row.currency as string,
    intervalMonths: row.interval_months as number,
  };
}

function mapSubscription(row: Record<string, unknown>): BusinessSubscription {
  return {
    id: row.id as string,
    businessId: row.business_id as string,
    planId: row.plan_id as string,
    status: row.status as SubscriptionStatus,
    currentPeriodStart: (row.current_period_start as string | null) ?? null,
    currentPeriodEnd: (row.current_period_end as string | null) ?? null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    provider: (row.provider as string | null) ?? null,
    providerSubscriptionId:
      (row.provider_subscription_id as string | null) ?? null,
  };
}

export async function listSubscriptionPlans(
  client: SupabaseClient,
): Promise<BillingApiResult<SubscriptionPlan[]>> {
  const { data, error } = await client
    .from("subscription_plans")
    .select(
      "id, code, name, description, price_kurus, currency, interval_months",
    )
    .eq("is_active", true)
    .order("price_kurus", { ascending: true });

  if (error) {
    return fail(error);
  }
  return {
    ok: true,
    data: (data ?? []).map((row) => mapPlan(row as Record<string, unknown>)),
  };
}

export async function getBusinessSubscription(
  client: SupabaseClient,
  businessId: string,
): Promise<BillingApiResult<BusinessSubscription | null>> {
  const { data, error } = await client
    .from("business_subscriptions")
    .select(
      "id, business_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, provider, provider_subscription_id",
    )
    .eq("business_id", businessId)
    .in("status", ["incomplete", "trialing", "active", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return fail(error);
  }
  if (!data) {
    return { ok: true, data: null };
  }
  return {
    ok: true,
    data: mapSubscription(data as Record<string, unknown>),
  };
}

export async function checkBusinessEntitled(
  client: SupabaseClient,
  businessId: string,
): Promise<BillingApiResult<boolean>> {
  const { data, error } = await client.rpc(
    "business_subscription_is_entitled",
    { p_business_id: businessId },
  );
  if (error) {
    return fail(error);
  }
  return { ok: true, data: Boolean(data) };
}

/**
 * Start checkout. If payment keys missing, persists blocked_no_provider —
 * never marks succeeded / never invents a charge.
 */
export async function startSubscriptionCheckout(
  client: SupabaseClient,
  input: { businessId: string; planId: string },
  providerConfig: PaymentProviderConfig,
  urls: { successUrl: string; cancelUrl: string },
): Promise<
  BillingApiResult<{
    checkoutId: string;
    status: CheckoutStatus;
    checkoutUrl: string | null;
    amountKurus: number;
  }>
> {
  const parsed = startCheckoutSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Geçersiz istek");
  }

  const providerConfigured = isPaymentProviderConfigured(providerConfig);
  const { data, error } = await client.rpc("start_subscription_checkout", {
    p_business_id: parsed.data.businessId,
    p_plan_id: parsed.data.planId,
    p_provider_configured: providerConfigured,
  });

  if (error || !data) {
    return fail(error ?? { message: "BILLING_CHECKOUT_NOT_FOUND" });
  }

  const session = data as Record<string, unknown>;
  const checkoutId = session.id as string;
  const amountKurus = session.amount_kurus as number;
  const status = session.status as CheckoutStatus;

  if (!providerConfigured || status === "blocked_no_provider") {
    return {
      ok: true,
      data: {
        checkoutId,
        status: "blocked_no_provider",
        checkoutUrl: null,
        amountKurus,
      },
    };
  }

  const plans = await listSubscriptionPlans(client);
  if (!plans.ok) {
    return fail(plans.error);
  }
  const plan = plans.data.find((p) => p.id === parsed.data.planId);
  if (!plan) {
    return fail({ message: "BILLING_PLAN_NOT_FOUND" });
  }

  const provider = resolvePaymentProvider(providerConfig);
  const checkout = await provider.createSubscriptionCheckout({
    amountKurus: plan.priceKurus,
    currency: plan.currency,
    businessId: parsed.data.businessId,
    planCode: plan.code,
    successUrl: urls.successUrl,
    cancelUrl: urls.cancelUrl,
  });

  if (!checkout.ok) {
    return {
      ok: true,
      data: {
        checkoutId,
        status: checkout.blockedNoProvider
          ? "blocked_no_provider"
          : "failed",
        checkoutUrl: null,
        amountKurus,
      },
    };
  }

  // Attach provider session via service role in production edge.
  // From browser we only return URL after RPC if a dedicated edge attaches it.
  // Here we surface provider result for the server route to attach.
  return {
    ok: true,
    data: {
      checkoutId,
      status: "provider_redirect",
      checkoutUrl: checkout.checkoutUrl,
      amountKurus,
    },
  };
}

export async function cancelBusinessSubscription(
  client: SupabaseClient,
  subscriptionId: string,
  atPeriodEnd = true,
): Promise<BillingApiResult<BusinessSubscription>> {
  const { data, error } = await client.rpc("cancel_business_subscription", {
    p_subscription_id: subscriptionId,
    p_at_period_end: atPeriodEnd,
  });
  if (error || !data) {
    return fail(error ?? { message: "BILLING_SUBSCRIPTION_NOT_FOUND" });
  }
  return {
    ok: true,
    data: mapSubscription(data as Record<string, unknown>),
  };
}
