import type { SupabaseClient } from "@supabase/supabase-js";
import {
  requestAccountDeletionSchema,
  type AccountDeletionRequestRow,
  type RequestAccountDeletionInput,
} from "./account-deletion";
import type { AccountDeletionStatus } from "./privacy";

export type DeletionApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function mapRow(row: Record<string, unknown>): AccountDeletionRequestRow {
  return {
    id: String(row.id),
    profile_id: String(row.profile_id),
    status: row.status as AccountDeletionStatus,
    reason: (row.reason as string | null) ?? null,
    requested_at: String(row.requested_at),
    processed_at: (row.processed_at as string | null) ?? null,
    processor_note: (row.processor_note as string | null) ?? null,
  };
}

export async function requestAccountDeletion(
  client: SupabaseClient | null,
  input: RequestAccountDeletionInput = {},
): Promise<DeletionApiResult<AccountDeletionRequestRow>> {
  if (!client) {
    return { ok: false, error: "Supabase bağlı değil. Silme talebi yazılmadı." };
  }
  const parsed = requestAccountDeletionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Geçersiz talep",
    };
  }
  const { data: session } = await client.auth.getSession();
  if (!session.session) {
    return {
      ok: false,
      error: "Oturum gerekli. Sahte silindi mesajı yok.",
    };
  }
  const { data, error } = await client.rpc("request_account_deletion", {
    p_reason: parsed.data.reason ?? null,
  });
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Talep oluşturulamadı" };
  }
  return { ok: true, data: mapRow(data as Record<string, unknown>) };
}

export async function listAccountDeletionRequests(
  client: SupabaseClient | null,
): Promise<DeletionApiResult<AccountDeletionRequestRow[]>> {
  if (!client) {
    return { ok: false, error: "Supabase bağlı değil." };
  }
  const { data, error } = await client
    .from("account_deletion_requests")
    .select("*")
    .order("requested_at", { ascending: false })
    .limit(100);
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: (data ?? []).map((r) => mapRow(r as Record<string, unknown>)),
  };
}

export async function adminUpdateAccountDeletion(
  client: SupabaseClient | null,
  requestId: string,
  status: Exclude<AccountDeletionStatus, "pending">,
  note?: string,
): Promise<DeletionApiResult<AccountDeletionRequestRow>> {
  if (!client) {
    return { ok: false, error: "Supabase bağlı değil." };
  }
  const { data, error } = await client.rpc(
    "admin_update_account_deletion_request",
    {
      p_request_id: requestId,
      p_status: status,
      p_note: note ?? null,
    },
  );
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Güncelleme başarısız" };
  }
  return { ok: true, data: mapRow(data as Record<string, unknown>) };
}
