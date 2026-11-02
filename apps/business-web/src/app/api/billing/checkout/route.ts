import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  isPaymentProviderConfigured,
  resolvePaymentProvider,
  startCheckoutSchema,
} from "@klimacin/shared";

/**
 * Server checkout entry. Never marks payment succeeded here.
 * Active entitlement comes only from signed provider webhooks.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = startCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Geçersiz istek" },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase yapılandırılmadı" },
      { status: 503 },
    );
  }

  const authHeader = req.headers.get("authorization");
  const client = createClient(supabaseUrl, anonKey, {
    global: authHeader
      ? { headers: { Authorization: authHeader } }
      : undefined,
  });

  const providerConfigured = isPaymentProviderConfigured({
    secretKey: process.env.STRIPE_SECRET_KEY,
  });

  const { data: sessionRow, error } = await client.rpc(
    "start_subscription_checkout",
    {
      p_business_id: parsed.data.businessId,
      p_plan_id: parsed.data.planId,
      p_provider_configured: providerConfigured,
    },
  );

  if (error || !sessionRow) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Checkout oluşturulamadı" },
      { status: 400 },
    );
  }

  const row = sessionRow as {
    id: string;
    status: string;
    amount_kurus: number;
  };

  if (!providerConfigured || row.status === "blocked_no_provider") {
    return NextResponse.json({
      ok: true,
      status: "blocked_no_provider",
      checkoutId: row.id,
      checkoutUrl: null,
      amountKurus: row.amount_kurus,
      dependency: "STRIPE_SECRET_KEY (+ PAYMENT_WEBHOOK_SECRET for activation)",
    });
  }

  const { data: plan, error: planError } = await client
    .from("subscription_plans")
    .select("code, price_kurus, currency")
    .eq("id", parsed.data.planId)
    .maybeSingle();

  if (planError || !plan) {
    return NextResponse.json(
      { ok: false, error: "Plan bulunamadı" },
      { status: 400 },
    );
  }

  const origin = req.nextUrl.origin;
  const provider = resolvePaymentProvider({
    secretKey: process.env.STRIPE_SECRET_KEY,
  });

  const checkout = await provider.createSubscriptionCheckout({
    amountKurus: plan.price_kurus as number,
    currency: (plan.currency as string) ?? "TRY",
    businessId: parsed.data.businessId,
    planCode: plan.code as string,
    successUrl: `${origin}/abonelik?checkout=success`,
    cancelUrl: `${origin}/abonelik?checkout=cancel`,
  });

  if (!checkout.ok) {
    return NextResponse.json({
      ok: true,
      status: checkout.blockedNoProvider ? "blocked_no_provider" : "failed",
      checkoutId: row.id,
      checkoutUrl: null,
      amountKurus: row.amount_kurus,
      error: checkout.errorDetail,
      dependency: checkout.blockedNoProvider
        ? "STRIPE_SECRET_KEY"
        : undefined,
    });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const admin = createClient(supabaseUrl, serviceKey);
    await admin.rpc("attach_checkout_provider_session", {
      p_checkout_id: row.id,
      p_provider: checkout.provider,
      p_provider_session_id: checkout.providerSessionId,
      p_checkout_url: checkout.checkoutUrl,
    });
  }

  return NextResponse.json({
    ok: true,
    status: "provider_redirect",
    checkoutId: row.id,
    checkoutUrl: checkout.checkoutUrl,
    amountKurus: row.amount_kurus,
  });
}
