import type { SupabaseClient } from "@supabase/supabase-js";
import { turkishAddressSchema, type TurkishAddress } from "./address";

export type AddressApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function upsertCustomerAddress(
  client: SupabaseClient,
  profileId: string,
  input: TurkishAddress,
): Promise<AddressApiResult<{ id: string }>> {
  const parsed = turkishAddressSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Geçersiz adres",
    };
  }

  const row = {
    profile_id: profileId,
    label: parsed.data.label ?? null,
    city_code: parsed.data.cityCode,
    city_name: parsed.data.cityName,
    district_code: parsed.data.districtCode,
    district_name: parsed.data.districtName,
    neighborhood: parsed.data.neighborhood ?? null,
    line1: parsed.data.line1,
    line2: parsed.data.line2 ?? null,
    postal_code: parsed.data.postalCode ?? null,
    lat: parsed.data.lat ?? null,
    lng: parsed.data.lng ?? null,
    is_default: parsed.data.isDefault,
  };

  if (parsed.data.id) {
    const { data, error } = await client
      .from("customer_addresses")
      .update(row)
      .eq("id", parsed.data.id)
      .eq("profile_id", profileId)
      .select("id")
      .single();
    if (error || !data) {
      return { ok: false, error: error?.message ?? "Adres güncellenemedi" };
    }
    return { ok: true, data: { id: data.id } };
  }

  const { data, error } = await client
    .from("customer_addresses")
    .insert(row)
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Adres kaydedilemedi" };
  }
  return { ok: true, data: { id: data.id } };
}

export async function listCustomerAddresses(
  client: SupabaseClient,
): Promise<AddressApiResult<TurkishAddress[]>> {
  const { data, error } = await client
    .from("customer_addresses")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    return { ok: false, error: error.message };
  }
  return {
    ok: true,
    data: (data ?? []).map((row) => ({
      id: row.id,
      label: row.label ?? undefined,
      cityCode: row.city_code,
      cityName: row.city_name,
      districtCode: row.district_code,
      districtName: row.district_name,
      neighborhood: row.neighborhood ?? undefined,
      line1: row.line1,
      line2: row.line2 ?? undefined,
      postalCode: row.postal_code ?? undefined,
      lat: row.lat ?? undefined,
      lng: row.lng ?? undefined,
      isDefault: Boolean(row.is_default),
    })),
  };
}
