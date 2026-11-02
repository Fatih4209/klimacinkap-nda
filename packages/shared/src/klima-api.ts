import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createKlimaRequestSchema,
  DEFAULT_KLIMA_HOLD_MINUTES,
  mapKlimaErrorMessage,
  submitKlimaOfferSchema,
  type CreateKlimaRequestInput,
  type KlimaOfferComparison,
  type SubmitKlimaOfferInput,
} from "./klima";

type RpcError = { message?: string; code?: string };

export type KlimaApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail<T>(error: RpcError | string): KlimaApiResult<T> {
  if (typeof error === "string") {
    return { ok: false, error };
  }
  return { ok: false, error: mapKlimaErrorMessage(error) };
}

/** Insert draft request — does not fake publish. */
export async function createKlimaRequestDraft(
  client: SupabaseClient,
  customerId: string,
  input: CreateKlimaRequestInput,
): Promise<KlimaApiResult<{ id: string }>> {
  const parsed = createKlimaRequestSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Geçersiz talep");
  }

  const { data, error } = await client
    .from("klima_requests")
    .insert({
      customer_id: customerId,
      address_id: parsed.data.addressId,
      job_type: parsed.data.jobType,
      description: parsed.data.description,
      preferred_window_start: parsed.data.preferredWindowStart ?? null,
      preferred_window_end: parsed.data.preferredWindowEnd ?? null,
      city_code: parsed.data.cityCode,
      city_name: parsed.data.cityName,
      district_code: parsed.data.districtCode,
      district_name: parsed.data.districtName,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    return fail(error ?? { message: "KLIMA_REQUEST_NOT_FOUND" });
  }
  return { ok: true, data: { id: data.id as string } };
}

export async function publishKlimaRequest(
  client: SupabaseClient,
  requestId: string,
): Promise<KlimaApiResult<unknown>> {
  const { data, error } = await client.rpc("publish_klima_request", {
    p_request_id: requestId,
  });
  if (error) {
    return fail(error);
  }
  return { ok: true, data };
}

export async function submitKlimaOffer(
  client: SupabaseClient,
  input: SubmitKlimaOfferInput,
): Promise<KlimaApiResult<unknown>> {
  const parsed = submitKlimaOfferSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Geçersiz teklif");
  }

  const { data, error } = await client.rpc("submit_klima_offer", {
    p_request_id: parsed.data.requestId,
    p_business_id: parsed.data.businessId,
    p_price_kurus: parsed.data.priceKurus,
    p_diagnosis_fee_kurus: parsed.data.diagnosisFeeKurus,
    p_scope_summary: parsed.data.scopeSummary,
    p_eta_minutes: parsed.data.etaMinutes,
    p_proposed_start: parsed.data.proposedStart ?? null,
    p_proposed_end: parsed.data.proposedEnd ?? null,
  });

  if (error) {
    return fail(error);
  }
  return { ok: true, data };
}

export async function acceptKlimaOffer(
  client: SupabaseClient,
  offerId: string,
  holdMinutes = DEFAULT_KLIMA_HOLD_MINUTES,
): Promise<KlimaApiResult<unknown>> {
  const { data, error } = await client.rpc("accept_klima_offer", {
    p_offer_id: offerId,
    p_hold_minutes: holdMinutes,
  });
  if (error) {
    return fail(error);
  }
  return { ok: true, data };
}

export async function confirmKlimaAppointment(
  client: SupabaseClient,
  appointmentId: string,
): Promise<KlimaApiResult<unknown>> {
  const { data, error } = await client.rpc("confirm_klima_appointment", {
    p_appointment_id: appointmentId,
  });
  if (error) {
    return fail(error);
  }
  return { ok: true, data };
}

export async function decideKlimaExtraWork(
  client: SupabaseClient,
  itemId: string,
  approve: boolean,
  note?: string,
): Promise<KlimaApiResult<unknown>> {
  const { data, error } = await client.rpc("decide_klima_extra_work", {
    p_item_id: itemId,
    p_approve: approve,
    p_note: note ?? null,
  });
  if (error) {
    return fail(error);
  }
  return { ok: true, data };
}

export async function completeKlimaAppointment(
  client: SupabaseClient,
  appointmentId: string,
): Promise<KlimaApiResult<unknown>> {
  const { data, error } = await client.rpc("complete_klima_appointment", {
    p_appointment_id: appointmentId,
  });
  if (error) {
    return fail(error);
  }
  return { ok: true, data };
}

export async function listKlimaOfferComparisons(
  client: SupabaseClient,
  requestId: string,
): Promise<KlimaApiResult<KlimaOfferComparison[]>> {
  const { data: offers, error } = await client
    .from("klima_offers")
    .select(
      "id, business_id, price_kurus, diagnosis_fee_kurus, scope_summary, eta_minutes, status, businesses(trade_name)",
    )
    .eq("request_id", requestId)
    .eq("status", "pending");

  if (error) {
    return fail(error);
  }

  const businessIds = (offers ?? []).map((o) => o.business_id as string);
  const statsByBusiness = new Map<string, number>();

  if (businessIds.length > 0) {
    const { data: stats, error: statsError } = await client
      .from("business_klima_stats")
      .select("business_id, completed_count")
      .in("business_id", businessIds);

    if (statsError) {
      return fail(statsError);
    }
    for (const row of stats ?? []) {
      statsByBusiness.set(
        row.business_id as string,
        Number(row.completed_count ?? 0),
      );
    }
  }

  const comparisons: KlimaOfferComparison[] = (offers ?? []).map((offer) => {
    const business = offer.businesses as
      | { trade_name?: string }
      | { trade_name?: string }[]
      | null;
    const tradeName = Array.isArray(business)
      ? (business[0]?.trade_name ?? "İşletme")
      : (business?.trade_name ?? "İşletme");

    return {
      offerId: offer.id as string,
      businessId: offer.business_id as string,
      tradeName,
      priceKurus: offer.price_kurus as number,
      diagnosisFeeKurus: offer.diagnosis_fee_kurus as number,
      scopeSummary: offer.scope_summary as string,
      etaMinutes: offer.eta_minutes as number,
      completedCount: statsByBusiness.get(offer.business_id as string) ?? 0,
      ratingAverage: null,
    };
  });

  return { ok: true, data: comparisons };
}
