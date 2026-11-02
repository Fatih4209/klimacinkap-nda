import { z } from "zod";

export const notificationKinds = [
  "order_status",
  "klima_status",
  "assignment",
  "message",
  "issue",
  "system",
] as const;
export type NotificationKind = (typeof notificationKinds)[number];

export const pushAttemptStatuses = [
  "queued",
  "sent",
  "failed",
  "skipped_no_provider",
] as const;
export type PushAttemptStatus = (typeof pushAttemptStatuses)[number];

export const messageThreadKinds = [
  "klima_appointment",
  "product_order",
  "job_assignment",
] as const;
export type MessageThreadKind = (typeof messageThreadKinds)[number];
export const messageThreadKindSchema = z.enum(messageThreadKinds);

export const issueStatuses = [
  "open",
  "under_review",
  "resolved",
  "closed",
  "rejected",
] as const;
export type IssueStatus = (typeof issueStatuses)[number];
export const issueStatusSchema = z.enum(issueStatuses);

export const issueSubjectKinds = [
  "klima_appointment",
  "product_order",
  "job_assignment",
] as const;
export type IssueSubjectKind = (typeof issueSubjectKinds)[number];
export const issueSubjectKindSchema = z.enum(issueSubjectKinds);

export const issueStatusLabelsTr: Record<IssueStatus, string> = {
  open: "Açık",
  under_review: "İnceleniyor",
  resolved: "Çözüldü",
  closed: "Kapatıldı",
  rejected: "Reddedildi",
};

export const registerPushTokenSchema = z.object({
  token: z.string().trim().min(8).max(512),
  platform: z.enum(["ios", "android", "web"]),
  appSurface: z.enum(["customer", "staff", "business_web"]),
});

export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>;

export const sendMessageSchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

export const openIssueSchema = z.object({
  subjectKind: issueSubjectKindSchema,
  subjectId: z.string().uuid(),
  title: z.string().trim().min(4).max(160),
  description: z.string().trim().min(8).max(4000),
});

export type OpenIssueInput = z.infer<typeof openIssueSchema>;

export type InAppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  productOrderId: string | null;
  klimaAppointmentId: string | null;
  jobAssignmentId: string | null;
  issueId: string | null;
  messageThreadId: string | null;
  readAt: string | null;
  createdAt: string;
};

/**
 * Push is never the source of truth for order/appointment state.
 * Clients must reload the referenced server row when acting on a notification.
 */
export function notificationRequiresServerRefresh(
  notification: Pick<
    InAppNotification,
    "productOrderId" | "klimaAppointmentId" | "jobAssignmentId"
  >,
): boolean {
  return Boolean(
    notification.productOrderId ||
      notification.klimaAppointmentId ||
      notification.jobAssignmentId,
  );
}

export type PushProviderConfig = {
  expoAccessToken?: string;
};

export function isPushProviderConfigured(
  config: PushProviderConfig,
): boolean {
  return Boolean(config.expoAccessToken && config.expoAccessToken.trim().length > 0);
}

export type ExpoPushSendResult =
  | {
      ok: true;
      providerMessageId: string;
    }
  | {
      ok: false;
      errorCode: string;
      errorDetail: string;
      /** Never claim delivery when provider is missing. */
      skippedNoProvider?: boolean;
    };

/**
 * Wire Expo Push HTTP API. Without EXPO_ACCESS_TOKEN, returns skipped — not success.
 */
export async function sendExpoPushMessage(input: {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  expoAccessToken?: string;
  fetchImpl?: typeof fetch;
}): Promise<ExpoPushSendResult> {
  if (!isPushProviderConfigured({ expoAccessToken: input.expoAccessToken })) {
    return {
      ok: false,
      errorCode: "PUSH_PROVIDER_NOT_CONFIGURED",
      errorDetail:
        "EXPO_ACCESS_TOKEN yok; push gönderimi başarılı sayılmadı (bağımlılık).",
      skippedNoProvider: true,
    };
  }

  const fetchFn = input.fetchImpl ?? fetch;
  const response = await fetchFn("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.expoAccessToken}`,
    },
    body: JSON.stringify({
      to: input.to,
      title: input.title,
      body: input.body,
      data: input.data ?? {},
      sound: "default",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return {
      ok: false,
      errorCode: "PUSH_HTTP_ERROR",
      errorDetail: `HTTP ${response.status}: ${text.slice(0, 300)}`,
    };
  }

  const json = (await response.json()) as {
    data?: { id?: string; status?: string; message?: string };
  };
  const ticketId = json.data?.id;
  if (!ticketId) {
    return {
      ok: false,
      errorCode: "PUSH_NO_TICKET_ID",
      errorDetail: "Expo ticket id dönmedi; sent yazılmaz.",
    };
  }

  return { ok: true, providerMessageId: ticketId };
}

export const notifyRpcErrors: Record<string, string> = {
  NOTIFY_AUTH_REQUIRED: "Giriş yapmanız gerekiyor.",
  NOTIFY_FORBIDDEN: "Bu işlem için yetkiniz yok.",
  NOTIFY_INVALID_TOKEN: "Geçersiz push token.",
  NOTIFY_NOT_FOUND: "Bildirim bulunamadı.",
  NOTIFY_SUBJECT_NOT_FOUND: "İlgili sipariş/iş bulunamadı.",
  NOTIFY_THREAD_NOT_FOUND: "Mesaj konusu bulunamadı.",
  NOTIFY_ISSUE_NOT_FOUND: "Sorun kaydı bulunamadı.",
  NOTIFY_FAKE_PUSH_FORBIDDEN:
    "Push gönderildi durumu için gerçek sağlayıcı kimliği gerekir.",
  NOTIFY_PUSH_ATTEMPT_NOT_FOUND: "Push denemesi bulunamadı.",
  PUSH_PROVIDER_NOT_CONFIGURED: "Push sağlayıcı yapılandırılmadı.",
};

export function mapNotifyErrorMessage(error: { message?: string }): string {
  const message = error.message ?? "";
  for (const [code, tr] of Object.entries(notifyRpcErrors)) {
    if (message.includes(code)) {
      return tr;
    }
  }
  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}
