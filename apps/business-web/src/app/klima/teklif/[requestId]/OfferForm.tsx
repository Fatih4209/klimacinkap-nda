"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { tryToKurus, submitKlimaOffer } from "@klimacin/shared";
import { Button, EmptyState } from "@klimacin/ui";
import { getBusinessSupabase } from "@/lib/supabase";

export function OfferForm({ requestId }: { requestId: string }) {
  const [businessId, setBusinessId] = useState("");
  const [priceTry, setPriceTry] = useState("");
  const [diagnosisTry, setDiagnosisTry] = useState("0");
  const [scopeSummary, setScopeSummary] = useState("");
  const [etaMinutes, setEtaMinutes] = useState("60");
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccessId(null);

    const client = getBusinessSupabase();
    if (!client) {
      setError(
        "Supabase bağlı değil. Teklif sahte olarak kaydedilmez.",
      );
      setBusy(false);
      return;
    }

    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      setError("Oturum gerekli. Auth bypass yok.");
      setBusy(false);
      return;
    }

    let priceKurus: number;
    let diagnosisFeeKurus: number;
    try {
      priceKurus = tryToKurus(Number(priceTry));
      diagnosisFeeKurus = tryToKurus(Number(diagnosisTry));
    } catch {
      setError("Geçerli tutar girin (TRY).");
      setBusy(false);
      return;
    }

    const result = await submitKlimaOffer(client, {
      requestId,
      businessId,
      priceKurus,
      diagnosisFeeKurus,
      scopeSummary,
      etaMinutes: Number(etaMinutes),
    });

    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }

    const row = result.data as { id?: string };
    if (!row?.id) {
      setError("Teklif kaydı doğrulanamadı.");
      setBusy(false);
      return;
    }

    setSuccessId(row.id);
    setBusy(false);
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{ display: "grid", gap: "0.9rem", maxWidth: 520 }}
    >
      <label style={{ display: "grid", gap: "0.35rem" }}>
        İşletme ID
        <input
          required
          value={businessId}
          onChange={(e) => setBusinessId(e.target.value)}
          placeholder="uuid"
          style={inputStyle}
        />
      </label>
      <label style={{ display: "grid", gap: "0.35rem" }}>
        Fiyat (TRY)
        <input
          required
          inputMode="decimal"
          value={priceTry}
          onChange={(e) => setPriceTry(e.target.value)}
          style={inputStyle}
        />
      </label>
      <label style={{ display: "grid", gap: "0.35rem" }}>
        Teşhis ücreti (TRY, zorunlu — 0 olabilir)
        <input
          required
          inputMode="decimal"
          value={diagnosisTry}
          onChange={(e) => setDiagnosisTry(e.target.value)}
          style={inputStyle}
        />
      </label>
      <label style={{ display: "grid", gap: "0.35rem" }}>
        Kapsam
        <textarea
          required
          minLength={8}
          value={scopeSummary}
          onChange={(e) => setScopeSummary(e.target.value)}
          rows={4}
          style={inputStyle}
        />
      </label>
      <label style={{ display: "grid", gap: "0.35rem" }}>
        ETA (dakika)
        <input
          required
          inputMode="numeric"
          value={etaMinutes}
          onChange={(e) => setEtaMinutes(e.target.value)}
          style={inputStyle}
        />
      </label>
      <Button type="submit" disabled={busy}>
        {busy ? "Kaydediliyor…" : "Teklifi gönder"}
      </Button>
      {error ? <EmptyState title="Kaydedilmedi">{error}</EmptyState> : null}
      {successId ? (
        <EmptyState title="Teklif kaydedildi">
          Kayıt id: {successId}
        </EmptyState>
      ) : null}
    </form>
  );
}

const inputStyle: CSSProperties = {
  padding: "0.7rem 0.8rem",
  borderRadius: 10,
  border: "1px solid var(--kk-border)",
  font: "inherit",
};
