import type { SupabaseClient } from "@supabase/supabase-js";

export type SubmitJobRatingInput = {
  score: number;
  comment?: string;
  klimaAppointmentId?: string;
  productOrderId?: string;
};

export type RatingsApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Customer rates a completed klima appointment or delivered product order.
 * Score 1–5; refuses without session / ineligible job (honest RPC errors).
 */
export async function submitJobRating(
  client: SupabaseClient | null,
  input: SubmitJobRatingInput,
): Promise<
  RatingsApiResult<{ id: string; score: number; businessId: string }>
> {
  if (!client) {
    return { ok: false, error: "Supabase bağlı değil. Puan uydurulmaz." };
  }
  if (
    !input.klimaAppointmentId &&
    !input.productOrderId
  ) {
    return { ok: false, error: "Puan için sipariş veya randevu gerekli." };
  }
  if (!Number.isInteger(input.score) || input.score < 1 || input.score > 5) {
    return { ok: false, error: "Puan 1–5 arası olmalı." };
  }

  const { data, error } = await client.rpc("submit_job_rating", {
    p_score: input.score,
    p_comment: input.comment?.trim() || null,
    p_klima_appointment_id: input.klimaAppointmentId ?? null,
    p_product_order_id: input.productOrderId ?? null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const row = data as {
    id: string;
    score: number;
    business_id: string;
  } | null;
  if (!row) {
    return { ok: false, error: "Puan kaydı dönmedi." };
  }

  return {
    ok: true,
    data: {
      id: row.id,
      score: row.score,
      businessId: row.business_id,
    },
  };
}
