import type { SupabaseClient } from "@supabase/supabase-js";

export type BusinessKpiSnapshot = {
  businessId: string;
  klimaAppointmentsTotal: number;
  klimaAppointmentsCompleted: number;
  productOrdersTotal: number;
  productOrdersDelivered: number;
  activeStaffAssignments: number;
};

export type KpiApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Owner KPI from real tables. Returns zeros only when counts are actually zero —
 * refuses when env/session/business missing (no fake dashboard numbers).
 */
export async function fetchBusinessKpi(
  client: SupabaseClient | null,
  businessId: string,
): Promise<KpiApiResult<BusinessKpiSnapshot>> {
  if (!client) {
    return { ok: false, error: "Supabase bağlı değil. KPI uydurulmaz." };
  }
  if (!businessId) {
    return { ok: false, error: "İşletme kimliği gerekli." };
  }

  const { data: session } = await client.auth.getSession();
  if (!session.session) {
    return { ok: false, error: "Oturum gerekli. Auth bypass yok." };
  }

  const [klimaAll, klimaDone, ordersAll, ordersDone, activeAssign] =
    await Promise.all([
      client
        .from("klima_appointments")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId),
      client
        .from("klima_appointments")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("status", "completed"),
      client
        .from("product_orders")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId),
      client
        .from("product_orders")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("status", "delivered"),
      client
        .from("job_assignments")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .in("status", ["assigned", "en_route", "on_site"]),
    ]);

  const err =
    klimaAll.error ||
    klimaDone.error ||
    ordersAll.error ||
    ordersDone.error ||
    activeAssign.error;
  if (err) {
    return { ok: false, error: err.message };
  }

  return {
    ok: true,
    data: {
      businessId,
      klimaAppointmentsTotal: klimaAll.count ?? 0,
      klimaAppointmentsCompleted: klimaDone.count ?? 0,
      productOrdersTotal: ordersAll.count ?? 0,
      productOrdersDelivered: ordersDone.count ?? 0,
      activeStaffAssignments: activeAssign.count ?? 0,
    },
  };
}
