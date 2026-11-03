"use client";

import { useState, type FormEvent } from "react";
import {
  requestPhoneOtp,
  signOutAuth,
  verifyPhoneOtp,
} from "@klimacin/shared";
import { Button, EmptyState } from "@klimacin/ui";
import { getBusinessSupabase } from "@/lib/supabase";

export function SmsOtpClient() {
  const client = getBusinessSupabase();
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!client) {
    return (
      <EmptyState title="SMS giriş kapalı">
        <code>NEXT_PUBLIC_SUPABASE_*</code> yok. Auth bypass / demo rol yok.
      </EmptyState>
    );
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const result = await requestPhoneOtp(client, { phone });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(true);
    setInfo("Kod isteği alındı (SMS sağlayıcı yapılandırmasına bağlı).");
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
    setInfo(`Oturum açıldı: ${result.data.userId}`);
  }

  async function onSignOut() {
    const result = await signOutAuth(client);
    if (!result.ok) setError(result.error);
    else setInfo("Oturum kapatıldı.");
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
      <Button type="button" variant="secondary" onClick={() => void onSignOut()}>
        Çıkış
      </Button>
      {error ? <EmptyState title="Giriş">{error}</EmptyState> : null}
      {info ? <EmptyState title="Durum">{info}</EmptyState> : null}
    </div>
  );
}
