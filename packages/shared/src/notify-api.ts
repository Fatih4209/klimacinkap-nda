import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapNotifyErrorMessage,
  openIssueSchema,
  registerPushTokenSchema,
  sendMessageSchema,
  type InAppNotification,
  type IssueStatus,
  type IssueSubjectKind,
  type MessageThreadKind,
  type OpenIssueInput,
  type RegisterPushTokenInput,
} from "./notify";

type RpcError = { message?: string };

export type NotifyApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail<T>(error: RpcError | string): NotifyApiResult<T> {
  if (typeof error === "string") {
    return { ok: false, error };
  }
  return { ok: false, error: mapNotifyErrorMessage(error) };
}

function mapNotification(row: Record<string, unknown>): InAppNotification {
  return {
    id: row.id as string,
    kind: row.kind as InAppNotification["kind"],
    title: row.title as string,
    body: row.body as string,
    productOrderId: (row.product_order_id as string | null) ?? null,
    klimaAppointmentId: (row.klima_appointment_id as string | null) ?? null,
    jobAssignmentId: (row.job_assignment_id as string | null) ?? null,
    issueId: (row.issue_id as string | null) ?? null,
    messageThreadId: (row.message_thread_id as string | null) ?? null,
    readAt: (row.read_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function registerPushToken(
  client: SupabaseClient,
  input: RegisterPushTokenInput,
): Promise<NotifyApiResult<{ id: string }>> {
  const parsed = registerPushTokenSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Geçersiz token");
  }
  const { data, error } = await client.rpc("register_push_token", {
    p_token: parsed.data.token,
    p_platform: parsed.data.platform,
    p_app_surface: parsed.data.appSurface,
  });
  if (error || !data) {
    return fail(error ?? { message: "NOTIFY_INVALID_TOKEN" });
  }
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function listNotifications(
  client: SupabaseClient,
): Promise<NotifyApiResult<InAppNotification[]>> {
  const { data, error } = await client
    .from("notifications")
    .select(
      "id, kind, title, body, product_order_id, klima_appointment_id, job_assignment_id, issue_id, message_thread_id, read_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return fail(error);
  }
  return {
    ok: true,
    data: (data ?? []).map((row) =>
      mapNotification(row as Record<string, unknown>),
    ),
  };
}

export async function markNotificationRead(
  client: SupabaseClient,
  notificationId: string,
): Promise<NotifyApiResult<InAppNotification>> {
  const { data, error } = await client.rpc("mark_notification_read", {
    p_notification_id: notificationId,
  });
  if (error || !data) {
    return fail(error ?? { message: "NOTIFY_NOT_FOUND" });
  }
  return {
    ok: true,
    data: mapNotification(data as Record<string, unknown>),
  };
}

/**
 * Fetch authoritative order/appointment status from server tables.
 * Do not trust notification payload as current state.
 */
export async function fetchServerSubjectStatus(
  client: SupabaseClient,
  refs: {
    productOrderId?: string | null;
    klimaAppointmentId?: string | null;
  },
): Promise<
  NotifyApiResult<{
    kind: "product_order" | "klima_appointment";
    id: string;
    status: string;
  }>
> {
  if (refs.productOrderId) {
    const { data, error } = await client
      .from("product_orders")
      .select("id, status")
      .eq("id", refs.productOrderId)
      .maybeSingle();
    if (error || !data) {
      return fail(error ?? { message: "NOTIFY_SUBJECT_NOT_FOUND" });
    }
    return {
      ok: true,
      data: {
        kind: "product_order",
        id: data.id as string,
        status: data.status as string,
      },
    };
  }
  if (refs.klimaAppointmentId) {
    const { data, error } = await client
      .from("klima_appointments")
      .select("id, status")
      .eq("id", refs.klimaAppointmentId)
      .maybeSingle();
    if (error || !data) {
      return fail(error ?? { message: "NOTIFY_SUBJECT_NOT_FOUND" });
    }
    return {
      ok: true,
      data: {
        kind: "klima_appointment",
        id: data.id as string,
        status: data.status as string,
      },
    };
  }
  return fail("Durum için sunucu referansı yok");
}

export async function openOrGetThread(
  client: SupabaseClient,
  kind: MessageThreadKind,
  subjectId: string,
): Promise<NotifyApiResult<{ id: string }>> {
  const { data, error } = await client.rpc("open_or_get_order_thread", {
    p_kind: kind,
    p_subject_id: subjectId,
  });
  if (error || !data) {
    return fail(error ?? { message: "NOTIFY_THREAD_NOT_FOUND" });
  }
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function listThreadMessages(
  client: SupabaseClient,
  threadId: string,
): Promise<
  NotifyApiResult<
    Array<{ id: string; senderId: string; body: string; createdAt: string }>
  >
> {
  const { data, error } = await client
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    return fail(error);
  }
  return {
    ok: true,
    data: (data ?? []).map((row) => ({
      id: row.id as string,
      senderId: row.sender_id as string,
      body: row.body as string,
      createdAt: row.created_at as string,
    })),
  };
}

export async function sendThreadMessage(
  client: SupabaseClient,
  threadId: string,
  body: string,
): Promise<NotifyApiResult<{ id: string }>> {
  const parsed = sendMessageSchema.safeParse({ threadId, body });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Geçersiz mesaj");
  }
  const { data, error } = await client.rpc("send_thread_message", {
    p_thread_id: parsed.data.threadId,
    p_body: parsed.data.body,
  });
  if (error || !data) {
    return fail(error ?? { message: "NOTIFY_THREAD_NOT_FOUND" });
  }
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function openIssue(
  client: SupabaseClient,
  input: OpenIssueInput,
): Promise<NotifyApiResult<{ id: string }>> {
  const parsed = openIssueSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Geçersiz sorun");
  }
  const { data, error } = await client.rpc("open_issue", {
    p_subject_kind: parsed.data.subjectKind,
    p_subject_id: parsed.data.subjectId,
    p_title: parsed.data.title,
    p_description: parsed.data.description,
  });
  if (error || !data) {
    return fail(error ?? { message: "NOTIFY_ISSUE_NOT_FOUND" });
  }
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function updateIssueStatus(
  client: SupabaseClient,
  issueId: string,
  status: IssueStatus,
  resolutionNote?: string,
): Promise<NotifyApiResult<{ id: string; status: IssueStatus }>> {
  const { data, error } = await client.rpc("update_issue_status", {
    p_issue_id: issueId,
    p_status: status,
    p_resolution_note: resolutionNote ?? null,
  });
  if (error || !data) {
    return fail(error ?? { message: "NOTIFY_ISSUE_NOT_FOUND" });
  }
  const row = data as { id: string; status: IssueStatus };
  return { ok: true, data: { id: row.id, status: row.status } };
}

export async function listIssues(
  client: SupabaseClient,
): Promise<
  NotifyApiResult<
    Array<{
      id: string;
      title: string;
      description: string;
      status: IssueStatus;
      subjectKind: IssueSubjectKind;
      createdAt: string;
    }>
  >
> {
  const { data, error } = await client
    .from("issues")
    .select(
      "id, title, description, status, subject_kind, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return fail(error);
  }
  return {
    ok: true,
    data: (data ?? []).map((row) => ({
      id: row.id as string,
      title: row.title as string,
      description: row.description as string,
      status: row.status as IssueStatus,
      subjectKind: row.subject_kind as IssueSubjectKind,
      createdAt: row.created_at as string,
    })),
  };
}
