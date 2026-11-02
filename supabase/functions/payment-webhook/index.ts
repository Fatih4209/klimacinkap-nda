/**
 * Stripe (or compatible) webhook receiver.
 * - Verifies signature presence + webhook secret (full Stripe constructEvent
 *   should be used with stripe SDK in production).
 * - Never activates subscription without provider event id + subscription id.
 * - Does not accept or store card payloads.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (req) => {
  const webhookSecret = Deno.env.get("PAYMENT_WEBHOOK_SECRET") ?? "";
  const signature = req.headers.get("stripe-signature") ?? "";
  const rawBody = await req.text();

  if (!webhookSecret.trim()) {
    return new Response(
      JSON.stringify({
        ok: false,
        errorCode: "PAYMENT_WEBHOOK_SECRET_MISSING",
        errorDetail: "Webhook secret missing; event not applied",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!signature.trim() || !rawBody) {
    return new Response(
      JSON.stringify({
        ok: false,
        errorCode: "PAYMENT_WEBHOOK_INVALID_SIGNATURE",
        errorDetail: "Missing signature or body — fake events rejected",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Production: replace with stripe.webhooks.constructEvent(rawBody, signature, secret)
  // Here we refuse to invent verification success without the SDK crypto check.
  // Operators must wire Stripe SDK; until then we hard-fail rather than fake OK.
  const allowUnsafe = Deno.env.get("PAYMENT_WEBHOOK_UNSAFE_PARSE") === "true";
  if (!allowUnsafe) {
    return new Response(
      JSON.stringify({
        ok: false,
        errorCode: "PAYMENT_WEBHOOK_VERIFY_NOT_WIRED",
        errorDetail:
          "Install Stripe signature verification before enabling; dependency recorded. Set PAYMENT_WEBHOOK_UNSAFE_PARSE only in controlled lab.",
      }),
      { status: 501, headers: { "Content-Type": "application/json" } },
    );
  }

  let event: {
    id?: string;
    type?: string;
    data?: { object?: Record<string, unknown> };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!event.id || !event.type) {
    return new Response(
      JSON.stringify({ ok: false, errorCode: "BILLING_FAKE_EVENT_FORBIDDEN" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const obj = event.data?.object ?? {};
  const businessId = (obj.client_reference_id ??
    (obj.metadata as { business_id?: string } | undefined)?.business_id) as
    | string
    | undefined;
  const subscriptionId = (obj.subscription ?? obj.id) as string | undefined;

  if (!businessId || !subscriptionId) {
    return new Response(
      JSON.stringify({
        ok: false,
        errorCode: "BILLING_FAKE_EVENT_FORBIDDEN",
        errorDetail: "business/subscription ids required from provider",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceKey);

  const status =
    event.type === "customer.subscription.deleted"
      ? "canceled"
      : event.type === "invoice.payment_failed"
        ? "past_due"
        : "active";

  const { error } = await admin.rpc("apply_subscription_provider_event", {
    p_provider: "stripe",
    p_provider_event_id: event.id,
    p_event_type: event.type,
    p_business_id: businessId,
    p_plan_id: null,
    p_provider_customer_id: (obj.customer as string | undefined) ?? null,
    p_provider_subscription_id: subscriptionId,
    p_status: status,
    p_period_start: null,
    p_period_end: null,
    p_checkout_session_id: null,
    p_payload_digest: null,
  });

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
