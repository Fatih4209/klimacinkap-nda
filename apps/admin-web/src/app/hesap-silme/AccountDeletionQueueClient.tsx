"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminUpdateAccountDeletion,
  listAccountDeletionRequests,
  type AccountDeletionRequestRow,
} from "@klimacin/shared";
import { Button, EmptyState } from "@klimacin/ui";
import { getAdminSupabase } from "@/lib/supabase";

export function AccountDeletionQueueClient() {
  const client = getAdminSupabase();
  const [rows, setRows] = useState<AccountDeletionRequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const result = await listAccountDeletionRequests(client);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setRows(result.data);
  }, [client]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!client) {
    return (
      <EmptyState title="Kuyruk kapalı">
        Env yok. Auth.users silme burada otomatik yapılmaz.
      </EmptyState>
    );
  }

  async function update(
    id: string,
    status: "processing" | "completed" | "rejected",
  ) {
    setBusy(true);
    setError(null);
    setInfo(null);
    const result = await adminUpdateAccountDeletion(client, id, status);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setInfo(`${id} → ${result.data.status}`);
    await reload();
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <Button type="button" variant="secondary" onClick={() => void reload()}>
        Yenile
      </Button>
      {error ? <EmptyState title="Kuyruk">{error}</EmptyState> : null}
      {info ? <EmptyState title="Güncelleme">{info}</EmptyState> : null}
      {rows.length === 0 && !error ? (
        <EmptyState title="Açık talep yok">
          completed, auth.users silmeyi otomatik yapmaz — ops checklist.
        </EmptyState>
      ) : null}
      {rows.map((row) => (
        <article
          key={row.id}
          style={{
            border: "1px solid var(--kk-border-subtle)",
            borderRadius: 12,
            padding: "1rem",
            display: "grid",
            gap: "0.5rem",
          }}
        >
          <strong>
            {row.status} · {row.profile_id}
          </strong>
          <span style={{ color: "var(--kk-text-secondary)", fontSize: "0.9rem" }}>
            {row.requested_at}
            {row.reason ? ` · ${row.reason}` : ""}
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <Button
              disabled={busy}
              onClick={() => void update(row.id, "processing")}
            >
              processing
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void update(row.id, "completed")}
            >
              completed (ops sonrası)
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void update(row.id, "rejected")}
            >
              rejected
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
