import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { color, space, typography } from "@klimacin/config";
import {
  getSupabaseBrowserClient,
  requestPhoneOtp,
  resolvePublicSupabaseEnv,
  verifyPhoneOtp,
} from "@klimacin/shared";
import { EmptyState } from "@klimacin/ui-native";

export function StaffSmsOtpScreen() {
  const client = getSupabaseBrowserClient(resolvePublicSupabaseEnv());
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!client) {
    return (
      <EmptyState
        title="Personel SMS giriş"
        body="Env yok. Davet + SMS Auth olmadan sahte personel oturumu yok."
      />
    );
  }

  async function onSend() {
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

  async function onVerify() {
    setBusy(true);
    setError(null);
    const result = await verifyPhoneOtp(client, { phone, token });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setInfo(`Oturum: ${result.data.userId}`);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>SMS ile personel girişi</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="+90…"
        keyboardType="phone-pad"
        placeholderTextColor={color.text.muted}
      />
      <Pressable style={styles.btn} disabled={busy} onPress={() => void onSend()}>
        <Text style={styles.btnText}>Kod gönder</Text>
      </Pressable>
      {sent ? (
        <>
          <TextInput
            style={styles.input}
            value={token}
            onChangeText={setToken}
            placeholder="SMS kodu"
            keyboardType="number-pad"
            placeholderTextColor={color.text.muted}
          />
          <Pressable
            style={styles.btn}
            disabled={busy}
            onPress={() => void onVerify()}
          >
            <Text style={styles.btnText}>Doğrula</Text>
          </Pressable>
        </>
      ) : null}
      {error ? <EmptyState title="Giriş" body={error} /> : null}
      {info ? <EmptyState title="Durum" body={info} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  title: { fontWeight: "700", color: color.text.primary },
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
