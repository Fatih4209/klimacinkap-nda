"use client";

import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  fetchServerSubjectStatus,
  issueStatusLabelsTr,
  listIssues,
  listNotifications,
  listThreadMessages,
  markNotificationRead,
  notificationRequiresServerRefresh,
  openOrGetThread,
  sendThreadMessage,
  updateIssueStatus,
  type InAppNotification,
  type IssueStatus,
} from "@klimacin/shared";
import { Button, EmptyState } from "@klimacin/ui";
import { getBusinessSupabase } from "@/lib/supabase";

export function CommsClient() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [issues, setIssues] = useState<
    Array<{
      id: string;
      title: string;
      description: string;
      status: IssueStatus;
      createdAt: string;
    }>
  >([]);
  const [subjectId, setSubjectId] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    Array<{ id: string; body: string; createdAt: string }>
  >([]);
  const [draft, setDraft] = useState("");
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const client = getBusinessSupabase();
    if (!client) {
      setError("Supabase istemcisi yok.");
      return;
    }
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      setError("Oturum gerekli.");
      return;
    }
    const notes = await listNotifications(client);
    if (!notes.ok) {
      setError(notes.error);
      return;
    }
    setNotifications(notes.data);
    const iss = await listIssues(client);
    if (!iss.ok) {
      setError(iss.error);
      return;
    }
    setIssues(iss.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openNote(item: InAppNotification) {
    const client = getBusinessSupabase();
    if (!client) {
      return;
    }
    await markNotificationRead(client, item.id);
    if (notificationRequiresServerRefresh(item)) {
      const status = await fetchServerSubjectStatus(client, {
        productOrderId: item.productOrderId,
        klimaAppointmentId: item.klimaAppointmentId,
      });
      if (status.ok) {
        setServerStatus(
          `Sunucu durumu: ${status.data.kind} → ${status.data.status}`,
        );
      } else {
        setError(status.error);
      }
    }
    await load();
  }

  async function openThread(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const client = getBusinessSupabase();
    if (!client) {
      setError("Supabase bağlı değil.");
      return;
    }
    const opened = await openOrGetThread(client, "product_order", subjectId);
    if (!opened.ok) {
      setError(opened.error);
      return;
    }
    setThreadId(opened.data.id);
    const listed = await listThreadMessages(client, opened.data.id);
    if (!listed.ok) {
      setError(listed.error);
      return;
    }
    setMessages(listed.data);
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!threadId) {
      return;
    }
    const client = getBusinessSupabase();
    if (!client) {
      return;
    }
    const result = await sendThreadMessage(client, threadId, draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDraft("");
    const listed = await listThreadMessages(client, threadId);
    if (listed.ok) {
      setMessages(listed.data);
    }
  }

  async function resolveIssue(issueId: string) {
    const client = getBusinessSupabase();
    if (!client) {
      return;
    }
    const result = await updateIssueStatus(
      client,
      issueId,
      "resolved",
      "İşletme tarafından çözüldü",
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setInfo(`Sorun güncellendi: ${result.data.status}`);
    await load();
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {error ? <EmptyState title="Hata">{error}</EmptyState> : null}
      {info ? <EmptyState title="Durum">{info}</EmptyState> : null}
      {serverStatus ? (
        <EmptyState title="Sunucu durumu (kaynak)">{serverStatus}</EmptyState>
      ) : null}

      <section style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Bildirimler</h3>
        {notifications.length === 0 ? (
          <EmptyState title="Bildirim yok">Liste boş.</EmptyState>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              className="kk-category-tile"
              data-accent="su"
              style={{ textAlign: "left", cursor: "pointer" }}
              onClick={() => void openNote(n)}
            >
              <strong>{n.title}</strong>
              <span style={{ color: "var(--kk-text-secondary)" }}>{n.body}</span>
            </button>
          ))
        )}
        <Button type="button" variant="secondary" onClick={() => void load()}>
          Yenile
        </Button>
      </section>

      <section style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Sipariş mesajı</h3>
        <form onSubmit={openThread} style={{ display: "grid", gap: "0.5rem" }}>
          <input
            required
            placeholder="product_order uuid"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            style={inputStyle}
          />
          <Button type="submit">Konuyu aç</Button>
        </form>
        {messages.map((m) => (
          <p key={m.id} style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
            {m.createdAt}: {m.body}
          </p>
        ))}
        {threadId ? (
          <form onSubmit={send} style={{ display: "grid", gap: "0.5rem" }}>
            <input
              required
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Mesaj"
              style={inputStyle}
            />
            <Button type="submit" variant="secondary">
              Gönder
            </Button>
          </form>
        ) : null}
      </section>

      <section style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Sorunlar</h3>
        {issues.length === 0 ? (
          <EmptyState title="Sorun yok">Kayıt yok.</EmptyState>
        ) : (
          issues.map((issue) => (
            <article
              key={issue.id}
              className="kk-category-tile"
              data-accent="tup"
              style={{ gap: "0.4rem" }}
            >
              <strong>
                {issue.title} · {issueStatusLabelsTr[issue.status]}
              </strong>
              <span style={{ color: "var(--kk-text-secondary)" }}>
                {issue.description}
              </span>
              {issue.status === "open" || issue.status === "under_review" ? (
                <Button
                  type="button"
                  onClick={() => void resolveIssue(issue.id)}
                >
                  Çözüldü işaretle
                </Button>
              ) : null}
            </article>
          ))
        )}
      </section>
    </div>
  );
}

const inputStyle: CSSProperties = {
  padding: "0.7rem 0.8rem",
  borderRadius: 10,
  border: "1px solid var(--kk-border)",
  font: "inherit",
};
