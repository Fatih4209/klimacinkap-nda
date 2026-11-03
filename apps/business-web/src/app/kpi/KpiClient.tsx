"use client";

import { useState, type FormEvent } from "react";
import { fetchBusinessKpi, type BusinessKpiSnapshot } from "@klimacin/shared";
import { Button, EmptyState } from "@klimacin/ui";
import { getBusinessSupabase } from "@/lib/supabase";

export function KpiClient() {
  const client = getBusinessSupabase();
  const [businessId, setBusinessId] = useState("");
  const [kpi, setKpi] = useState<BusinessKpiSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!client) {
    return (
      <EmptyState title="KPI kapalı">
        Env yokken sahte metrik üretilmez.
      </EmptyState>
    );
  }

  async function onLoad(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setKpi(null);
    const result = await fetchBusinessKpi(client, businessId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setKpi(result.data);
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <form onSubmit={onLoad} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <input
          value={businessId}
          onChange={(e) => setBusinessId(e.target.value)}
          placeholder="İşletme UUID"
          required
          style={{ flex: 1, minWidth: 220, padding: "0.65rem" }}
        />
        <Button type="submit" disabled={busy}>
          KPI yükle
        </Button>
      </form>
      {error ? <EmptyState title="KPI">{error}</EmptyState> : null}
      {kpi ? (
        <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: "0.35rem" }}>
          <li>Klima randevu: {kpi.klimaAppointmentsTotal} (tamamlanan {kpi.klimaAppointmentsCompleted})</li>
          <li>Ürün sipariş: {kpi.productOrdersTotal} (teslim {kpi.productOrdersDelivered})</li>
          <li>Aktif personel ataması: {kpi.activeStaffAssignments}</li>
        </ul>
      ) : null}
    </div>
  );
}
