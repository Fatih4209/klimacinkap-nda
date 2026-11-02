import { Pressable, StyleSheet, Text, View } from "react-native";
import { brand, color, space, typography } from "@klimacin/config";
import {
  ACCOUNT_DELETION_STEPS_TR,
  DATA_CATEGORIES,
  buildCustomSchemeUrl,
  buildHttpsDeepLinkUrl,
} from "@klimacin/shared";
import { EmptyState } from "@klimacin/ui-native";
import { AddressForm } from "./AddressForm";

type Props = {
  onBack: () => void;
};

/**
 * Store-facing account + privacy surface. Deletion is request-only;
 * no fake wipe without Supabase session + admin processing.
 */
export function AccountScreen({ onBack }: Props) {
  const privacyScheme = buildCustomSchemeUrl({
    surface: "customer",
    kind: "privacy",
  });
  const deletionHttps = buildHttpsDeepLinkUrl({
    surface: "customer",
    kind: "accountDeletion",
  });

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onBack} accessibilityRole="button">
        <Text style={styles.back}>← Ana</Text>
      </Pressable>
      <Text style={styles.title}>Hesap</Text>
      <Text style={styles.body}>
        {brand.name} — gizlilik ve hesap silme mağaza hazırlığı. Cihaz E2E bu
        ekranda “geçti” sayılmaz.
      </Text>

      <Text style={styles.section}>Veri kategorileri</Text>
      {DATA_CATEGORIES.slice(0, 4).map((c) => (
        <Text key={c.id} style={styles.item}>
          · {c.titleTr}: {c.fieldsTr}
        </Text>
      ))}
      <Text style={styles.muted}>
        Tam liste web: /gizlilik · şema tabloları shared/privacy
      </Text>

      <Text style={styles.section}>Hesap silme</Text>
      {ACCOUNT_DELETION_STEPS_TR.slice(0, 3).map((s) => (
        <Text key={s} style={styles.item}>
          · {s}
        </Text>
      ))}

      <AddressForm />

      <EmptyState
        title="Oturum / silme RPC"
        body={`SMS Auth + request_account_deletion gerekir. Derin bağlantı (DNS sonrası): ${deletionHttps}. Özel şema: ${privacyScheme}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[3] },
  back: {
    color: color.brand.mid,
    fontFamily: typography.fontFamily.sans,
    fontWeight: "600",
    fontSize: typography.size.sm,
  },
  title: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size["2xl"],
    color: color.text.primary,
  },
  body: {
    fontFamily: typography.fontFamily.sans,
    color: color.text.secondary,
    fontSize: typography.size.md,
  },
  section: {
    marginTop: space[2],
    fontFamily: typography.fontFamily.sans,
    fontWeight: "700",
    color: color.text.primary,
  },
  item: {
    fontFamily: typography.fontFamily.sans,
    color: color.text.secondary,
    fontSize: typography.size.sm,
  },
  muted: {
    fontFamily: typography.fontFamily.sans,
    color: color.text.muted,
    fontSize: typography.size.xs,
  },
});
