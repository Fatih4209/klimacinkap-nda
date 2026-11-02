"use client";

import { useState } from "react";
import { requestAccountDeletionSchema } from "@klimacin/shared";
import { Button, EmptyState } from "@klimacin/ui";
import { getBusinessSupabase } from "../../lib/supabase";

export function AccountDeletionClient() {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const parsed = requestAccountDeletionSchema.safeParse({
        reason: reason.trim() || undefined,
      });
      if (!parsed.success) {
        setError("Açıklama en fazla 500 karakter olabilir.");
        return;
      }

      const supabase = getBusinessSupabase();
      if (!supabase) {
        setError("Supabase istemcisi yapılandırılmadı.");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError(
          "Oturum yok. SMS Auth bağlandıktan sonra giriş yapıp talep oluşturun. Sahte silme yok.",
        );
        return;
      }

      const { data, error: rpcError } = await supabase.rpc(
        "request_account_deletion",
        { p_reason: parsed.data.reason ?? null },
      );

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      setMessage(
        `Talep alındı (durum: ${data?.status ?? "pending"}). Tamamlanma admin/ops sonrası; hemen silindi sayılmaz.`,
      );
      setReason("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: "0.75rem" }}>
      <h3 style={{ margin: 0 }}>Silme talebi oluştur</h3>
      <label style={{ display: "grid", gap: "0.35rem" }}>
        <span style={{ color: "var(--kk-text-secondary)" }}>
          İsteğe bağlı açıklama
        </span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: 8,
            border: "1px solid var(--kk-border-subtle)",
            font: "inherit",
          }}
        />
      </label>
      <Button onClick={submit} disabled={busy}>
        {busy ? "Gönderiliyor…" : "Hesap silme talebi gönder"}
      </Button>
      {error ? <EmptyState title="Talep oluşturulamadı">{error}</EmptyState> : null}
      {message ? <EmptyState title="Talep kaydı">{message}</EmptyState> : null}
    </section>
  );
}
