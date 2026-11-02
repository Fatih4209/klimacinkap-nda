/**
 * Supabase Edge Function stub — Expo push dispatch worker.
 *
 * Deploy only after provisioning secrets. Without EXPO_ACCESS_TOKEN this
 * function must NOT report delivery success.
 *
 * Secrets (server-only):
 * - EXPO_ACCESS_TOKEN
 * - SUPABASE_SERVICE_ROLE_KEY (platform-provided on edge)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (_req) => {
  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({
        ok: false,
        errorCode: "SUPABASE_ENV_MISSING",
        errorDetail: "Edge env incomplete; no fake push success",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!expoAccessToken.trim()) {
    return new Response(
      JSON.stringify({
        ok: false,
        errorCode: "PUSH_PROVIDER_NOT_CONFIGURED",
        errorDetail:
          "EXPO_ACCESS_TOKEN missing — push not marked sent. Dependency recorded.",
        sent: 0,
        skipped: true,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const admin = createClient(supabaseUrl, serviceKey);
  // Dynamic import of shared worker is not available in Deno edge as workspace package;
  // inline minimal loop consistent with packages/shared/src/push-worker.ts contract.
  const { data: attempts, error } = await admin
    .from("push_delivery_attempts")
    .select(
      "id, device_token_id, notification_id, notifications(title, body), device_push_tokens(token)",
    )
    .eq("status", "queued")
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let failed = 0;

  for (const attempt of attempts ?? []) {
    const notification = attempt.notifications as
      | { title?: string; body?: string }
      | null;
    const tokenRow = attempt.device_push_tokens as { token?: string } | null;
    const token = tokenRow?.token;
    const title = notification?.title;
    const body = notification?.body;

    if (!token || !title || !body) {
      await admin.rpc("record_push_attempt_result", {
        p_attempt_id: attempt.id,
        p_status: "failed",
        p_provider: "expo",
        p_provider_message_id: null,
        p_error_code: "PUSH_MISSING_TOKEN_OR_CONTENT",
        p_error_detail: "missing",
      });
      failed += 1;
      continue;
    }

    const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${expoAccessToken}`,
      },
      body: JSON.stringify({ to: token, title, body, sound: "default" }),
    });

    const json = (await pushRes.json()) as { data?: { id?: string } };
    const ticketId = json.data?.id;
    if (!pushRes.ok || !ticketId) {
      await admin.rpc("record_push_attempt_result", {
        p_attempt_id: attempt.id,
        p_status: "failed",
        p_provider: "expo",
        p_provider_message_id: null,
        p_error_code: "PUSH_HTTP_OR_NO_TICKET",
        p_error_detail: `status=${pushRes.status}`,
      });
      failed += 1;
      continue;
    }

    await admin.rpc("record_push_attempt_result", {
      p_attempt_id: attempt.id,
      p_status: "sent",
      p_provider: "expo",
      p_provider_message_id: ticketId,
      p_error_code: null,
      p_error_detail: null,
    });
    sent += 1;
  }

  return new Response(JSON.stringify({ ok: true, sent, failed }), {
    headers: { "Content-Type": "application/json" },
  });
});
