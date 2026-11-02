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
  resolvePublicSupabaseEnv,
  upsertCustomerAddress,
} from "@klimacin/shared";
import { EmptyState } from "@klimacin/ui-native";

export function AddressForm() {
  const client = getSupabaseBrowserClient(resolvePublicSupabaseEnv());
  const [cityCode, setCityCode] = useState("34");
  const [cityName, setCityName] = useState("İstanbul");
  const [districtCode, setDistrictCode] = useState("");
  const [districtName, setDistrictName] = useState("");
  const [line1, setLine1] = useState("");
  const [label, setLabel] = useState("Ev");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!client) {
    return (
      <EmptyState
        title="Adres kaydı kapalı"
        body="Supabase env yok. Sahte adres yazılmaz; SMS Auth sonrası açılır."
      />
    );
  }

  async function onSave() {
    setBusy(true);
    setError(null);
    setInfo(null);
    const { data: sessionData } = await client!.auth.getSession();
    if (!sessionData.session?.user) {
      setError("Oturum gerekli. Auth bypass yok.");
      setBusy(false);
      return;
    }
    const result = await upsertCustomerAddress(
      client!,
      sessionData.session.user.id,
      {
        label,
        cityCode,
        cityName,
        districtCode,
        districtName,
        line1,
        isDefault: true,
      },
    );
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setInfo(`Adres kaydedildi: ${result.data.id}`);
    setBusy(false);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.section}>Adres ekle</Text>
      <TextInput
        style={styles.input}
        value={label}
        onChangeText={setLabel}
        placeholder="Etiket"
        placeholderTextColor={color.text.muted}
      />
      <TextInput
        style={styles.input}
        value={cityCode}
        onChangeText={setCityCode}
        placeholder="İl kodu"
        placeholderTextColor={color.text.muted}
      />
      <TextInput
        style={styles.input}
        value={cityName}
        onChangeText={setCityName}
        placeholder="İl"
        placeholderTextColor={color.text.muted}
      />
      <TextInput
        style={styles.input}
        value={districtCode}
        onChangeText={setDistrictCode}
        placeholder="İlçe kodu"
        placeholderTextColor={color.text.muted}
      />
      <TextInput
        style={styles.input}
        value={districtName}
        onChangeText={setDistrictName}
        placeholder="İlçe"
        placeholderTextColor={color.text.muted}
      />
      <TextInput
        style={styles.input}
        value={line1}
        onChangeText={setLine1}
        placeholder="Adres satırı"
        placeholderTextColor={color.text.muted}
      />
      <Pressable
        onPress={() => void onSave()}
        style={styles.btn}
        disabled={busy}
      >
        <Text style={styles.btnText}>
          {busy ? "Kaydediliyor…" : "Adresi kaydet"}
        </Text>
      </Pressable>
      {error ? <EmptyState title="Adres kaydı" body={error} /> : null}
      {info ? <EmptyState title="Tamam" body={info} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  section: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: "700",
    color: color.text.primary,
    marginTop: space[2],
  },
  input: {
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderRadius: 8,
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    fontFamily: typography.fontFamily.sans,
    color: color.text.primary,
    backgroundColor: color.surface.raised,
  },
  btn: {
    backgroundColor: color.brand.deep,
    borderRadius: 999,
    paddingVertical: space[3],
    alignItems: "center",
  },
  btnText: {
    color: color.text.inverse,
    fontWeight: "700",
  },
});
