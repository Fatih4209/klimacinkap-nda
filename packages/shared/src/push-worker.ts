import type { SupabaseClient } from "@supabase/supabase-js";
import { isPushProviderConfigured, sendExpoPushMessage } from "./notify";

/**
 * Process queued push attempts. Never marks sent without a provider ticket id.
 * When EXPO_ACCESS_TOKEN is missing, attempts stay / become skipped_no_provider.
 */
export async function processQueuedPushAttempts(
  client: SupabaseClient,
  opts: { expoAccessToken?: string },
): Promise<{ processed: number; sent: number; skipped: number; failed: number }> {
  const providerReady = isPushProviderConfigured({
    expoAccessToken: opts.expoAccessToken,
  });

  const { data: attempts, error } = await client
    .from("push_delivery_attempts")
    .select(
      "id, status, device_token_id, notification_id, notifications(title, body), device_push_tokens(token)",
    )
    .eq("status", "queued")
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const attempt of attempts ?? []) {
    processed += 1;
    const notification = attempt.notifications as
      | { title?: string; body?: string }
      | { title?: string; body?: string }[]
      | null;
    const title = Array.isArray(notification)
      ? notification[0]?.title
      : notification?.title;
    const body = Array.isArray(notification)
      ? notification[0]?.body
      : notification?.body;

    const tokenRow = attempt.device_push_tokens as
      | { token?: string }
      | { token?: string }[]
      | null;
    const token = Array.isArray(tokenRow)
      ? tokenRow[0]?.token
      : tokenRow?.token;

    if (!providerReady) {
      await client.rpc("record_push_attempt_result", {
        p_attempt_id: attempt.id,
        p_status: "skipped_no_provider",
        p_provider: null,
        p_provider_message_id: null,
        p_error_code: "PUSH_PROVIDER_NOT_CONFIGURED",
        p_error_detail: "EXPO_ACCESS_TOKEN missing",
      });
      skipped += 1;
      continue;
    }

    if (!token || !title || !body) {
      await client.rpc("record_push_attempt_result", {
        p_attempt_id: attempt.id,
        p_status: "failed",
        p_provider: "expo",
        p_provider_message_id: null,
        p_error_code: "PUSH_MISSING_TOKEN_OR_CONTENT",
        p_error_detail: "Token or notification content missing",
      });
      failed += 1;
      continue;
    }

    const result = await sendExpoPushMessage({
      to: token,
      title,
      body,
      data: { notificationId: attempt.notification_id },
      expoAccessToken: opts.expoAccessToken,
    });

    if (result.ok) {
      await client.rpc("record_push_attempt_result", {
        p_attempt_id: attempt.id,
        p_status: "sent",
        p_provider: "expo",
        p_provider_message_id: result.providerMessageId,
        p_error_code: null,
        p_error_detail: null,
      });
      sent += 1;
    } else if (result.skippedNoProvider) {
      await client.rpc("record_push_attempt_result", {
        p_attempt_id: attempt.id,
        p_status: "skipped_no_provider",
        p_provider: null,
        p_provider_message_id: null,
        p_error_code: result.errorCode,
        p_error_detail: result.errorDetail,
      });
      skipped += 1;
    } else {
      await client.rpc("record_push_attempt_result", {
        p_attempt_id: attempt.id,
        p_status: "failed",
        p_provider: "expo",
        p_provider_message_id: null,
        p_error_code: result.errorCode,
        p_error_detail: result.errorDetail,
      });
      failed += 1;
    }
  }

  return { processed, sent, skipped, failed };
}
