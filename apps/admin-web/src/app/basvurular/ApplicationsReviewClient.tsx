"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminReviewBusinessApplication,
  listApplicationsForAdmin,
  type BusinessApplicationRow,
} from "@klimacin/shared";
import { Button, EmptyState } from "@klimacin/ui";
import { getAdminSupabase } from "@/lib/supabase";

export function ApplicationsReviewClient() {
  const client = getAdminSupabase();
  const [rows, setRows] = useState<BusinessApplicationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!client) return;
    setError(null);
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      setError("Oturum gerekli. Açık admin kaydı / bypass yok.");
      setRows([]);
      return;
    }
    const result = await listApplicationsForAdmin(client);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRows(result.data);
  }, [client]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!client) {
    return (
      <EmptyState title="Supabase bağlantısı yok">
        Başvuru listesi ve inceleme RPC’leri hazır; env olmadan veri
        uydurulmaz.
      </EmptyState>
    );
  }

  async function review(
    applicationId: string,
    decision: "approve" | "reject" | "needs_info",
    activateBusiness: boolean,
  ) {
    setBusy(true);
    setError(null);
    setInfo(null);
    const result = await adminReviewBusinessApplication(client!, {
      applicationId,
      decision,
      activateBusiness,
    });
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setInfo(`Güncellendi: ${result.data.tradeName} → ${result.data.status}`);
    setBusy(false);
    await reload();
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <Button type="button" variant="secondary" onClick={() => void reload()}>
        Yenile
      </Button>
      {error ? <EmptyState title="Liste / işlem">{error}</EmptyState> : null}
      {info ? <EmptyState title="Sonuç">{info}</EmptyState> : null}
      {rows.length === 0 && !error ? (
        <EmptyState title="Başvuru yok">
          Sahte işletme listesi yok. Gerçek kayıtlar burada görünür.
        </EmptyState>
      ) : null}
      {rows.map((row) => (
        <article
          key={row.id}
          style={{
            display: "grid",
            gap: "0.5rem",
            padding: "1rem",
            border: "1px solid var(--kk-border-subtle)",
            borderRadius: 12,
          }}
        >
          <strong>
            {row.tradeName} · {row.status}
          </strong>
          <span style={{ color: "var(--kk-text-secondary)" }}>
            {row.legalName} · {row.cityName}/{row.districtName} ·{" "}
            {row.categories.join(", ")}
          </span>
          <span style={{ color: "var(--kk-text-muted)", fontSize: "0.85rem" }}>
            Yetkili servis iddiası: {row.claimsAuthorizedService ? "evet" : "hayır"}{" "}
            (onay değildir)
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <Button
              disabled={busy}
              onClick={() => void review(row.id, "approve", true)}
            >
              Onayla + aktifleştir
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void review(row.id, "approve", false)}
            >
              Onayla (pasif)
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void review(row.id, "needs_info", false)}
            >
              Bilgi iste
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void review(row.id, "reject", false)}
            >
              Reddet
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
