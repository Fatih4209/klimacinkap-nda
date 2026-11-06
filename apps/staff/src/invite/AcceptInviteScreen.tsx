import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { color, space, typography } from "@klimacin/config";
import {
  acceptStaffInvite,
  getSupabaseBrowserClient,
  resolvePublicSupabaseEnv,
} from "@klimacin/shared";
import { EmptyState } from "@klimacin/ui-native";
import { useStaffDeepLink } from "../linking";

export function AcceptInviteScreen() {
  const client = getSupabaseBrowserClient(resolvePublicSupabaseEnv());
  const deepLink = useStaffDeepLink();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (deepLink?.kind === "invite" && deepLink.inviteToken) {
      setToken(deepLink.inviteToken);
      setInfo("Davet bağlantısından token dolduruldu. Kabul et’e basın.");
    }
  }, [deepLink]);

  if (!client) {
    return (
      <EmptyState
        title="Davet kabul"
        body="Supabase yok. Davet kabul edilmez; açık personel kaydı yok."
      />
    );
  }

  async function onAccept() {
    setBusy(true);
    setError(null);
    setInfo(null);
    const result = await acceptStaffInvite(client!, token.trim());
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setInfo(`Davet kabul edildi: ${result.data.id}`);
    setToken("");
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Personel davetini kabul et</Text>
      <Text style={styles.body}>
        İşletme sahibi davet token’ını paylaşır. Kabul etmeden üyelik aktif
        olmaz.
      </Text>
      <TextInput
        style={styles.input}
        value={token}
        onChangeText={setToken}
        placeholder="Davet token"
        autoCapitalize="none"
        placeholderTextColor={color.text.muted}
      />
      <Pressable
        style={styles.btn}
        disabled={busy}
        onPress={() => void onAccept()}
      >
        <Text style={styles.btnText}>Kabul et</Text>
      </Pressable>
      {error ? <EmptyState title="Davet" body={error} /> : null}
      {info ? <EmptyState title="Durum" body={info} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  title: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: "700",
    color: color.text.primary,
  },
  body: { color: color.text.secondary, fontSize: typography.size.sm },
  input: {
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderRadius: 8,
    padding: space[3],
    color: color.text.primary,
    backgroundColor: color.surface.raised,
  },
  btn: {
    backgroundColor: color.brand.deep,
    borderRadius: 999,
    paddingVertical: space[3],
    alignItems: "center",
  },
  btnText: { color: color.text.inverse, fontWeight: "700" },
});
