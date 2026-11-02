"use client";

import { useState, type FormEvent } from "react";
import { Button, EmptyState } from "@klimacin/ui";

export function BootstrapClient({ configuredHint }: { configuredHint: boolean }) {
  const [profileId, setProfileId] = useState("");
  const [bootstrapSecret, setBootstrapSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!configuredHint) {
    return (
      <EmptyState title="Bootstrap yapılandırılmadı">
        <code>ADMIN_BOOTSTRAP_SECRET</code> ve{" "}
        <code>SUPABASE_SERVICE_ROLE_KEY</code> sunucuda yok. Açık admin kaydı
        yoktur; sahte “admin oldunuz” mesajı gösterilmez.
      </EmptyState>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/admin/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, bootstrapSecret }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        data?: { profileId: string };
      };
      if (!json.ok) {
        setError(json.error ?? "Bootstrap başarısız");
        return;
      }
      setInfo(
        `İlk platform admin atandı: ${json.data?.profileId}. Secret’ı döndürmeyin; ikinci kez reddedilir.`,
      );
      setBootstrapSecret("");
    } catch {
      setError("İstek gönderilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.85rem" }}>
      <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
        Kullanıcı önce SMS Auth ile <code>profiles</code> satırı oluşturmuş
        olmalı. Bu form yalnızca ilk admin içindir; sonrasında{" "}
        <code>BOOTSTRAP_ALREADY_DONE</code>.
      </p>
      <label style={{ display: "grid", gap: "0.35rem" }}>
        Profil UUID
        <input
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
          required
          pattern="[0-9a-fA-F-]{36}"
          style={{
            padding: "0.65rem 0.75rem",
            borderRadius: 8,
            border: "1px solid var(--kk-border-subtle)",
            font: "inherit",
          }}
        />
      </label>
      <label style={{ display: "grid", gap: "0.35rem" }}>
        Bootstrap secret
        <input
          type="password"
          value={bootstrapSecret}
          onChange={(e) => setBootstrapSecret(e.target.value)}
          required
          minLength={16}
          style={{
            padding: "0.65rem 0.75rem",
            borderRadius: 8,
            border: "1px solid var(--kk-border-subtle)",
            font: "inherit",
          }}
        />
      </label>
      <Button type="submit" disabled={busy}>
        {busy ? "İşleniyor…" : "İlk admin’i ata"}
      </Button>
      {error ? <EmptyState title="Bootstrap reddedildi">{error}</EmptyState> : null}
      {info ? <EmptyState title="Bootstrap">{info}</EmptyState> : null}
    </form>
  );
}
