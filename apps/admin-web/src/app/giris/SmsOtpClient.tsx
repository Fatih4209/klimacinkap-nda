"use client";

import { useState, type FormEvent } from "react";
import { requestPhoneOtp, verifyPhoneOtp } from "@klimacin/shared";
import { Button, EmptyState } from "@klimacin/ui";
import { getAdminSupabase } from "@/lib/supabase";

export function AdminSmsOtpClient() {
  const client = getAdminSupabase();
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!client) {
    return (
      <EmptyState title="Admin SMS giriş kapalı">
        Env yok. Açık admin kaydı yoktur — ilk admin için{" "}
        <code>/bootstrap</code>.
      </EmptyState>
    );
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await requestPhoneOtp(client, { phone });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(true);
    setInfo("Kod isteği alındı.");
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await verifyPhoneOtp(client, { phone, token });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setInfo(
      `Oturum: ${result.data.userId}. platform_admin rolü yoksa panel RPC’leri reddeder.`,
    );
  }

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <form onSubmit={onSend} style={{ display: "grid", gap: "0.5rem" }}>
        <label>
          Telefon
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
        <Button type="submit" disabled={busy}>
          Kod gönder
        </Button>
      </form>
      {sent ? (
        <form onSubmit={onVerify} style={{ display: "grid", gap: "0.5rem" }}>
          <label>
            SMS kodu
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>
          <Button type="submit" disabled={busy}>
            Doğrula
          </Button>
        </form>
      ) : null}
      {error ? <EmptyState title="Giriş">{error}</EmptyState> : null}
      {info ? <EmptyState title="Durum">{info}</EmptyState> : null}
    </div>
  );
}
