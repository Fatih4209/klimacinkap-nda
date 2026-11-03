import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assignStaffSchema,
  completeAssignmentSchema,
  mapStaffErrorMessage,
  staffLocationPingSchema,
  type AssignStaffInput,
  type AssignmentStatus,
  type JobAssignment,
  type StaffLocationPingInput,
} from "./staff";

type RpcError = { message?: string };

export type StaffApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail<T>(error: RpcError | string): StaffApiResult<T> {
  if (typeof error === "string") {
    return { ok: false, error };
  }
  return { ok: false, error: mapStaffErrorMessage(error) };
}

function mapAssignment(row: Record<string, unknown>): JobAssignment {
  return {
    id: row.id as string,
    businessId: row.business_id as string,
    staffProfileId: row.staff_profile_id as string,
    kind: row.kind as JobAssignment["kind"],
    klimaAppointmentId: (row.klima_appointment_id as string | null) ?? null,
    productOrderId: (row.product_order_id as string | null) ?? null,
    status: row.status as AssignmentStatus,
    completionCode: row.completion_code as string,
    assignedAt: row.assigned_at as string,
  };
}

export async function assignStaff(
  client: SupabaseClient,
  input: AssignStaffInput,
): Promise<StaffApiResult<JobAssignment>> {
  const parsed = assignStaffSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Geçersiz atama");
  }

  if (parsed.data.klimaAppointmentId) {
    const { data, error } = await client.rpc(
      "assign_staff_to_klima_appointment",
      {
        p_appointment_id: parsed.data.klimaAppointmentId,
        p_staff_profile_id: parsed.data.staffProfileId,
      },
    );
    if (error || !data) {
      return fail(error ?? { message: "STAFF_ASSIGNMENT_NOT_FOUND" });
    }
    return { ok: true, data: mapAssignment(data as Record<string, unknown>) };
  }

  const { data, error } = await client.rpc("assign_staff_to_product_order", {
    p_order_id: parsed.data.productOrderId!,
    p_staff_profile_id: parsed.data.staffProfileId,
  });
  if (error || !data) {
    return fail(error ?? { message: "STAFF_ASSIGNMENT_NOT_FOUND" });
  }
  return { ok: true, data: mapAssignment(data as Record<string, unknown>) };
}

export async function listMyAssignments(
  client: SupabaseClient,
): Promise<StaffApiResult<JobAssignment[]>> {
  const { data: sessionData } = await client.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) {
    return fail({ message: "STAFF_AUTH_REQUIRED" });
  }

  const { data, error } = await client
    .from("job_assignments")
    .select(
      "id, business_id, staff_profile_id, kind, klima_appointment_id, product_order_id, status, completion_code, assigned_at",
    )
    .eq("staff_profile_id", userId)
    .order("assigned_at", { ascending: false });

  if (error) {
    return fail(error);
  }
  return {
    ok: true,
    data: (data ?? []).map((row) =>
      mapAssignment(row as Record<string, unknown>),
    ),
  };
}

export async function updateAssignmentStatus(
  client: SupabaseClient,
  assignmentId: string,
  status: AssignmentStatus,
): Promise<StaffApiResult<JobAssignment>> {
  const { data, error } = await client.rpc("staff_update_assignment_status", {
    p_assignment_id: assignmentId,
    p_status: status,
  });
  if (error || !data) {
    return fail(error ?? { message: "STAFF_ASSIGNMENT_NOT_FOUND" });
  }
  return { ok: true, data: mapAssignment(data as Record<string, unknown>) };
}

export async function postStaffLocation(
  client: SupabaseClient,
  input: StaffLocationPingInput,
): Promise<StaffApiResult<{ id: string }>> {
  const parsed = staffLocationPingSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Geçersiz konum");
  }

  const { data, error } = await client.rpc("staff_post_location", {
    p_assignment_id: parsed.data.assignmentId,
    p_lat: parsed.data.lat,
    p_lng: parsed.data.lng,
    p_accuracy_m: parsed.data.accuracyM ?? null,
    p_recorded_at: parsed.data.recordedAt ?? null,
  });

  if (error || !data) {
    return fail(error ?? { message: "STAFF_ASSIGNMENT_NOT_FOUND" });
  }
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function completeAssignment(
  client: SupabaseClient,
  assignmentId: string,
  completionCode: string,
): Promise<StaffApiResult<JobAssignment>> {
  const parsed = completeAssignmentSchema.safeParse({
    assignmentId,
    completionCode,
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Geçersiz kod");
  }

  const { data, error } = await client.rpc("staff_complete_assignment", {
    p_assignment_id: parsed.data.assignmentId,
    p_completion_code: parsed.data.completionCode,
  });
  if (error || !data) {
    return fail(error ?? { message: "STAFF_ASSIGNMENT_NOT_FOUND" });
  }
  return { ok: true, data: mapAssignment(data as Record<string, unknown>) };
}

export type AssignmentTracking = {
  assignmentId: string;
  status: AssignmentStatus;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  recordedAt: string | null;
  receivedAt: string | null;
  isLive: boolean;
  trackingActive: boolean;
};

export async function inviteStaffMember(
  client: SupabaseClient,
  businessId: string,
  staffProfileId: string,
): Promise<StaffApiResult<{ id: string; inviteToken: string | null; isActive: boolean }>> {
  const { data, error } = await client.rpc("invite_staff_member", {
    p_business_id: businessId,
    p_staff_profile_id: staffProfileId,
  });
  if (error || !data) {
    return fail(error ?? { message: "STAFF_PROFILE_NOT_FOUND" });
  }
  const row = data as {
    id: string;
    invite_token?: string | null;
    is_active?: boolean;
  };
  return {
    ok: true,
    data: {
      id: row.id,
      inviteToken: row.invite_token ?? null,
      isActive: Boolean(row.is_active),
    },
  };
}

export async function acceptStaffInvite(
  client: SupabaseClient,
  inviteToken: string,
): Promise<StaffApiResult<{ id: string }>> {
  const { data, error } = await client.rpc("accept_staff_invite", {
    p_invite_token: inviteToken,
  });
  if (error || !data) {
    return fail(error ?? { message: "STAFF_INVITE_NOT_FOUND" });
  }
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function getAssignmentTracking(
  client: SupabaseClient,
  assignmentId: string,
): Promise<StaffApiResult<AssignmentTracking>> {
  const { data, error } = await client.rpc("get_assignment_tracking", {
    p_assignment_id: assignmentId,
  });
  if (error) {
    return fail(error);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return fail({ message: "STAFF_ASSIGNMENT_NOT_FOUND" });
  }

  const r = row as Record<string, unknown>;
  return {
    ok: true,
    data: {
      assignmentId: r.assignment_id as string,
      status: r.status as AssignmentStatus,
      lat: (r.lat as number | null) ?? null,
      lng: (r.lng as number | null) ?? null,
      accuracyM: (r.accuracy_m as number | null) ?? null,
      recordedAt: (r.recorded_at as string | null) ?? null,
      receivedAt: (r.received_at as string | null) ?? null,
      isLive: Boolean(r.is_live),
      trackingActive: Boolean(r.tracking_active),
    },
  };
}
