import type { SupabaseClient } from "@supabase/supabase-js";
import {
  adminReviewApplicationSchema,
  mapApplicationErrorMessage,
  saveBusinessApplicationSchema,
  type AdminReviewApplicationInput,
  type BusinessApplicationRow,
  type SaveBusinessApplicationInput,
} from "./business-application";

export type ApplicationApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail<T>(error: { message?: string } | string): ApplicationApiResult<T> {
  if (typeof error === "string") return { ok: false, error };
  return { ok: false, error: mapApplicationErrorMessage(error) };
}

function mapRow(row: Record<string, unknown>): BusinessApplicationRow {
  return {
    id: String(row.id),
    applicantProfileId: String(row.applicant_profile_id),
    businessId: (row.business_id as string | null) ?? null,
    legalName: String(row.legal_name),
    tradeName: String(row.trade_name),
    taxId: String(row.tax_id),
    phone: String(row.phone),
    email: String(row.email),
    cityCode: String(row.city_code),
    cityName: String(row.city_name),
    districtCode: String(row.district_code),
    districtName: String(row.district_name),
    categories: row.categories as BusinessApplicationRow["categories"],
    claimsAuthorizedService: Boolean(row.claims_authorized_service),
    status: row.status as BusinessApplicationRow["status"],
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function saveBusinessApplicationDraft(
  client: SupabaseClient,
  input: SaveBusinessApplicationInput,
): Promise<ApplicationApiResult<BusinessApplicationRow>> {
  const parsed = saveBusinessApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Geçersiz başvuru");
  }

  const { data, error } = await client.rpc("save_business_application_draft", {
    p_legal_name: parsed.data.legalName,
    p_trade_name: parsed.data.tradeName,
    p_tax_id: parsed.data.taxId,
    p_phone: parsed.data.phone,
    p_email: parsed.data.email,
    p_city_code: parsed.data.cityCode,
    p_city_name: parsed.data.cityName,
    p_district_code: parsed.data.districtCode,
    p_district_name: parsed.data.districtName,
    p_categories: parsed.data.categories,
    p_claims_authorized_service: parsed.data.claimsAuthorizedService,
    p_notes: parsed.data.notes ?? null,
    p_application_id: parsed.data.applicationId ?? null,
  });

  if (error || !data) {
    return fail(error ?? { message: "APPLICATION_SAVE_FAILED" });
  }
  return { ok: true, data: mapRow(data as Record<string, unknown>) };
}

export async function submitBusinessApplication(
  client: SupabaseClient,
  applicationId: string,
): Promise<ApplicationApiResult<BusinessApplicationRow>> {
  const { data, error } = await client.rpc("submit_business_application", {
    p_application_id: applicationId,
  });
  if (error || !data) {
    return fail(error ?? { message: "APPLICATION_SUBMIT_FORBIDDEN" });
  }
  return { ok: true, data: mapRow(data as Record<string, unknown>) };
}

export async function listOwnBusinessApplications(
  client: SupabaseClient,
): Promise<ApplicationApiResult<BusinessApplicationRow[]>> {
  const { data, error } = await client
    .from("business_applications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return fail(error);
  return {
    ok: true,
    data: (data ?? []).map((row) => mapRow(row as Record<string, unknown>)),
  };
}

export async function listApplicationsForAdmin(
  client: SupabaseClient,
): Promise<ApplicationApiResult<BusinessApplicationRow[]>> {
  const { data, error } = await client
    .from("business_applications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return fail(error);
  return {
    ok: true,
    data: (data ?? []).map((row) => mapRow(row as Record<string, unknown>)),
  };
}

export async function adminReviewBusinessApplication(
  client: SupabaseClient,
  input: AdminReviewApplicationInput,
): Promise<ApplicationApiResult<BusinessApplicationRow>> {
  const parsed = adminReviewApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Geçersiz inceleme");
  }

  const { data, error } = await client.rpc("admin_review_business_application", {
    p_application_id: parsed.data.applicationId,
    p_decision: parsed.data.decision,
    p_reviewer_note: parsed.data.reviewerNote ?? null,
    p_activate_business: parsed.data.activateBusiness,
  });

  if (error || !data) {
    return fail(error ?? { message: "APPLICATION_REVIEW_FAILED" });
  }
  return { ok: true, data: mapRow(data as Record<string, unknown>) };
}
