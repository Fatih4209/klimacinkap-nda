import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { color, radius, space, typography } from "@klimacin/config";
import {
  fetchServerSubjectStatus,
  getSupabaseBrowserClient,
  issueStatusLabelsTr,
  listIssues,
  listNotifications,
  listThreadMessages,
  markNotificationRead,
  notificationRequiresServerRefresh,
  openIssue,
  openOrGetThread,
  registerPushToken,
  resolvePublicSupabaseEnv,
  sendThreadMessage,
  type InAppNotification,
} from "@klimacin/shared";
import { EmptyState } from "@klimacin/ui-native";

type Tab = "notifications" | "messages" | "issues";

export function NotificationsHub({ onBack }: { onBack: () => void }) {
  const client = useMemo(
    () => getSupabaseBrowserClient(resolvePublicSupabaseEnv()),
    [],
  );
  const [tab, setTab] = useState<Tab>("notifications");
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [subjectKind, setSubjectKind] = useState<
    "product_order" | "klima_appointment"
  >("product_order");
  const [messages, setMessages] = useState<
    Array<{ id: string; body: string; createdAt: string }>
  >([]);
  const [draft, setDraft] = useState("");
  const [issueTitle, setIssueTitle] = useState("");
  const [issueBody, setIssueBody] = useState("");
  const [issues, setIssues] = useState<
    Array<{ id: string; title: string; status: string; createdAt: string }>
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function requireClient() {
    if (!client) {
      return {
        ok: false as const,
        error: "Supabase bağlı değil. Bildirim/mesaj sahte oluşturulmaz.",
      };
    }
    const { data } = await client.auth.getSession();
    if (!data.session) {
      return {
        ok: false as const,
        error: "Oturum gerekli. Push/mesaj için Auth şart; bypass yok.",
      };
    }
    return { ok: true as const, client };
  }

  async function loadNotifications() {
    setBusy(true);
    setError(null);
    setServerStatus(null);
    try {
      const session = await requireClient();
      if (!session.ok) {
        setError(session.error);
        return;
      }
      const listed = await listNotifications(session.client);
      if (!listed.ok) {
        setError(listed.error);
        return;
      }
      setItems(listed.data);
    } finally {
      setBusy(false);
    }
  }

  async function onOpenNotification(item: InAppNotification) {
    const session = await requireClient();
    if (!session.ok) {
      setError(session.error);
      return;
    }
    await markNotificationRead(session.client, item.id);
    if (notificationRequiresServerRefresh(item)) {
      const status = await fetchServerSubjectStatus(session.client, {
        productOrderId: item.productOrderId,
        klimaAppointmentId: item.klimaAppointmentId,
      });
      if (!status.ok) {
        setError(status.error);
        return;
      }
      setServerStatus(
        `Sunucu durumu (push kaynak değil): ${status.data.kind} → ${status.data.status}`,
      );
    } else {
      setServerStatus("Bu bildirimde sipariş referansı yok.");
    }
    await loadNotifications();
  }

  async function registerDeviceToken() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const session = await requireClient();
      if (!session.ok) {
        setError(session.error);
        return;
      }
      // Expo push token requires native build + project credentials.
      // Without provider keys, registration of a placeholder is refused — no fake success.
      const expoToken = process.env.EXPO_PUBLIC_PUSH_TOKEN?.trim();
      if (!expoToken) {
        setInfo(
          "Push bağımlılık: EXPO_PUBLIC_PUSH_TOKEN / EXPO_ACCESS_TOKEN yok. Token kaydı ve gönderim başarılı sayılmadı; in-app bildirimler yine de çalışır.",
        );
        return;
      }
      const result = await registerPushToken(session.client, {
        token: expoToken,
        platform: "android",
        appSurface: "customer",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInfo(`Cihaz token kaydedildi: ${result.data.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function openThread() {
    setBusy(true);
    setError(null);
    try {
      const session = await requireClient();
      if (!session.ok) {
        setError(session.error);
        return;
      }
      const opened = await openOrGetThread(
        session.client,
        subjectKind,
        subjectId,
      );
      if (!opened.ok) {
        setError(opened.error);
        return;
      }
      setThreadId(opened.data.id);
      const listed = await listThreadMessages(session.client, opened.data.id);
      if (!listed.ok) {
        setError(listed.error);
        return;
      }
      setMessages(listed.data);
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage() {
    if (!threadId) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const session = await requireClient();
      if (!session.ok) {
        setError(session.error);
        return;
      }
      const sent = await sendThreadMessage(session.client, threadId, draft);
      if (!sent.ok) {
        setError(sent.error);
        return;
      }
      setDraft("");
      const listed = await listThreadMessages(session.client, threadId);
      if (listed.ok) {
        setMessages(listed.data);
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitIssue() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const session = await requireClient();
      if (!session.ok) {
        setError(session.error);
        return;
      }
      const created = await openIssue(session.client, {
        subjectKind,
        subjectId,
        title: issueTitle,
        description: issueBody,
      });
      if (!created.ok) {
        setError(created.error);
        return;
      }
      setInfo(`Sorun açıldı: ${created.data.id}`);
      await loadIssues();
    } finally {
      setBusy(false);
    }
  }

  async function loadIssues() {
    const session = await requireClient();
    if (!session.ok) {
      setError(session.error);
      return;
    }
    const listed = await listIssues(session.client);
    if (!listed.ok) {
      setError(listed.error);
      return;
    }
    setIssues(
      listed.data.map((i) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        createdAt: i.createdAt,
      })),
    );
  }

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onBack}>
        <Text style={styles.back}>← Ana sayfa</Text>
      </Pressable>
      <Text style={styles.title}>Bildirim · Mesaj · Sorun</Text>
      <Text style={styles.subtitle}>
        Sipariş durumu her zaman sunucudan okunur. Push teslimatı anahtar yoksa
        başarılı sayılmaz.
      </Text>

      <View style={styles.chips}>
        {(
          [
            ["notifications", "Bildirimler"],
            ["messages", "Mesajlar"],
            ["issues", "Sorunlar"],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[styles.chip, tab === key ? styles.chipActive : null]}
          >
            <Text
              style={[
                styles.chipText,
                tab === key ? styles.chipTextActive : null,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <EmptyState title="İşlem yapılamadı" body={error} /> : null}
      {info ? <EmptyState title="Durum" body={info} /> : null}
      {serverStatus ? (
        <EmptyState title="Sunucu durumu" body={serverStatus} />
      ) : null}

      {tab === "notifications" ? (
        <View style={styles.card}>
          <Pressable
            disabled={busy}
            onPress={loadNotifications}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Bildirimleri yükle</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={registerDeviceToken}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>Push token kaydet</Text>
          </Pressable>
          {items.length === 0 ? (
            <EmptyState
              title="Bildirim yok"
              body="Sahte bildirim yok. Sunucu olayları oluşunca listelenir."
            />
          ) : (
            items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => void onOpenNotification(item)}
                style={styles.rowItem}
              >
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.meta}>{item.body}</Text>
                <Text style={styles.meta}>
                  {item.readAt ? "Okundu" : "Yeni"} · {item.createdAt}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}

      {tab === "messages" ? (
        <View style={styles.card}>
          <Text style={styles.meta}>Sipariş veya klima randevu ID</Text>
          <View style={styles.chips}>
            <Pressable
              onPress={() => setSubjectKind("product_order")}
              style={[
                styles.chip,
                subjectKind === "product_order" ? styles.chipActive : null,
              ]}
            >
              <Text style={styles.chipText}>Sipariş</Text>
            </Pressable>
            <Pressable
              onPress={() => setSubjectKind("klima_appointment")}
              style={[
                styles.chip,
                subjectKind === "klima_appointment" ? styles.chipActive : null,
              ]}
            >
              <Text style={styles.chipText}>Klima</Text>
            </Pressable>
          </View>
          <TextInput
            value={subjectId}
            onChangeText={setSubjectId}
            placeholder="uuid"
            placeholderTextColor={color.text.muted}
            style={styles.input}
          />
          <Pressable disabled={busy} onPress={openThread} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Konuyu aç</Text>
          </Pressable>
          {messages.map((m) => (
            <Text key={m.id} style={styles.meta}>
              {m.createdAt}: {m.body}
            </Text>
          ))}
          {threadId ? (
            <>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Mesaj"
                placeholderTextColor={color.text.muted}
                style={styles.input}
              />
              <Pressable
                disabled={busy}
                onPress={sendMessage}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>Gönder</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}

      {tab === "issues" ? (
        <View style={styles.card}>
          <TextInput
            value={subjectId}
            onChangeText={setSubjectId}
            placeholder="Sipariş / randevu uuid"
            placeholderTextColor={color.text.muted}
            style={styles.input}
          />
          <TextInput
            value={issueTitle}
            onChangeText={setIssueTitle}
            placeholder="Başlık"
            placeholderTextColor={color.text.muted}
            style={styles.input}
          />
          <TextInput
            value={issueBody}
            onChangeText={setIssueBody}
            placeholder="Açıklama"
            placeholderTextColor={color.text.muted}
            multiline
            style={[styles.input, { minHeight: 80 }]}
          />
          <Pressable disabled={busy} onPress={submitIssue} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Sorun aç</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={loadIssues}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>Sorunları yenile</Text>
          </Pressable>
          {issues.map((issue) => (
            <Text key={issue.id} style={styles.meta}>
              {issue.title} ·{" "}
              {issueStatusLabelsTr[
                issue.status as keyof typeof issueStatusLabelsTr
              ] ?? issue.status}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[4] },
  back: { color: color.brand.mid, fontWeight: "600" },
  title: {
    fontSize: typography.size["2xl"],
    fontWeight: "700",
    color: color.text.primary,
  },
  subtitle: { color: color.text.secondary },
  card: {
    gap: space[3],
    padding: space[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border.subtle,
    backgroundColor: color.surface.raised,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  chip: {
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderRadius: radius.sm,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  chipActive: {
    backgroundColor: color.brand.soft,
    borderColor: color.brand.mid,
  },
  chipText: { color: color.text.secondary },
  chipTextActive: { color: color.brand.deep, fontWeight: "700" },
  primaryBtn: {
    backgroundColor: color.brand.deep,
    borderRadius: 999,
    paddingVertical: space[3],
    alignItems: "center",
  },
  primaryBtnText: { color: color.text.inverse, fontWeight: "700" },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: color.brand.mid,
    borderRadius: 999,
    paddingVertical: space[2],
    paddingHorizontal: space[4],
    alignItems: "center",
  },
  secondaryBtnText: { color: color.brand.deep, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderRadius: radius.sm,
    padding: space[3],
    color: color.text.primary,
  },
  rowItem: {
    gap: space[1],
    paddingVertical: space[3],
    borderTopWidth: 1,
    borderTopColor: color.border.subtle,
  },
  rowTitle: { fontWeight: "700", color: color.text.primary },
  meta: { color: color.text.secondary, fontSize: typography.size.sm },
});
