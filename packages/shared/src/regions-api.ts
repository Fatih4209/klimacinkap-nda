import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapRegionErrorMessage,
  upsertServiceRegionSchema,
  type ServiceRegionRow,
  type UpsertServiceRegionInput,
} from "./regions";

export type RegionApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail<T>(error: { message?: string } | string): RegionApiResult<T> {
  if (typeof error === "string") return { ok: false, error };
  return { ok: false, error: mapRegionErrorMessage(error) };
}

function mapRow(row: Record<string, unknown>): ServiceRegionRow {
  return {
    id: String(row.id),
    cityCode: String(row.city_code),
    cityName: String(row.city_name),
    districtCode: String(row.district_code),
    districtName: String(row.district_name),
    category: row.category as ServiceRegionRow["category"],
    isOpen: Boolean(row.is_open),
  };
}

export async function adminUpsertServiceRegion(
  client: SupabaseClient,
  input: UpsertServiceRegionInput,
): Promise<RegionApiResult<ServiceRegionRow>> {
  const parsed = upsertServiceRegionSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Geçersiz bölge");
  }

  const { data, error } = await client.rpc("admin_upsert_service_region", {
    p_city_code: parsed.data.cityCode,
    p_city_name: parsed.data.cityName,
    p_district_code: parsed.data.districtCode,
    p_district_name: parsed.data.districtName,
    p_category: parsed.data.category,
    p_is_open: parsed.data.isOpen,
  });

  if (error || !data) {
    return fail(error ?? { message: "REGION_UPSERT_FAILED" });
  }
  return { ok: true, data: mapRow(data as Record<string, unknown>) };
}

export async function listServiceRegions(
  client: SupabaseClient,
): Promise<RegionApiResult<ServiceRegionRow[]>> {
  const { data, error } = await client
    .from("service_regions")
    .select("*")
    .order("city_name", { ascending: true });
  if (error) return fail(error);
  return {
    ok: true,
    data: (data ?? []).map((row) => mapRow(row as Record<string, unknown>)),
  };
}
