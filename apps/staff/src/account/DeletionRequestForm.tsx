import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { color, space, typography } from "@klimacin/config";
import {
  getSupabaseBrowserClient,
  requestAccountDeletion,
  resolvePublicSupabaseEnv,
} from "@klimacin/shared";
import { EmptyState } from "@klimacin/ui-native";

/** Same request flow as customer — staff uses own session + memberships. */
export function DeletionRequestForm() {
  const client = getSupabaseBrowserClient(resolvePublicSupabaseEnv());
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!client) {
    return (
      <EmptyState
        title="Hesap silme"
        body="Env yok; talep yazılmaz. Anında wipe yok."
      />
    );
  }

  async function onSubmit() {
    setBusy(true);
    setError(null);
    setInfo(null);
    const result = await requestAccountDeletion(client, {
      reason: reason.trim() || undefined,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setInfo(
      `Talep alındı (${result.data.status}). Tamamlanma admin/ops sonrası.`,
    );
    setReason("");
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.section}>Silme talebi</Text>
      <TextInput
        style={styles.input}
        value={reason}
        onChangeText={setReason}
        placeholder="İsteğe bağlı açıklama"
        placeholderTextColor={color.text.muted}
        multiline
      />
      <Pressable
        style={styles.btn}
        disabled={busy}
        onPress={() => void onSubmit()}
      >
        <Text style={styles.btnText}>Talep gönder</Text>
      </Pressable>
      {error ? <EmptyState title="Silme" body={error} /> : null}
      {info ? <EmptyState title="Durum" body={info} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  section: {
    fontWeight: "700",
    color: color.text.primary,
    marginTop: space[2],
  },
  input: {
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderRadius: 8,
    padding: space[3],
    minHeight: 72,
    color: color.text.primary,
    backgroundColor: color.surface.raised,
  },
  btn: {
    backgroundColor: color.state.danger,
    borderRadius: 999,
    paddingVertical: space[3],
    alignItems: "center",
  },
  btnText: { color: color.text.inverse, fontWeight: "700" },
});
