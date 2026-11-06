import { Pressable, StyleSheet, Text, View } from "react-native";
import { brand, color, space, typography } from "@klimacin/config";
import {
  ACCOUNT_DELETION_STEPS_TR,
  buildHttpsDeepLinkUrl,
} from "@klimacin/shared";
import { EmptyState } from "@klimacin/ui-native";
import { DeletionRequestForm } from "./DeletionRequestForm";

type Props = {
  onBack: () => void;
};

export function StaffAccountScreen({ onBack }: Props) {
  const deletionHttps = buildHttpsDeepLinkUrl({
    surface: "customer",
    kind: "accountDeletion",
  });

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onBack} accessibilityRole="button">
        <Text style={styles.back}>← Görevler</Text>
      </Pressable>
      <Text style={styles.title}>Hesap · Personel</Text>
      <Text style={styles.body}>
        {brand.name} personel uygulaması. Konum yalnızca atanmış işte; hesap
        silme talebi push + üyelikleri pasifleştirir, anında wipe yoktur.
      </Text>
      {ACCOUNT_DELETION_STEPS_TR.map((s) => (
        <Text key={s} style={styles.item}>
          · {s}
        </Text>
      ))}
      <DeletionRequestForm />
      <EmptyState
        title="Gizlilik / silme URL"
        body={`Web: /gizlilik ve /hesap-silme. Mağaza: ${deletionHttps} (DNS sonrası).`}
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
  item: {
    fontFamily: typography.fontFamily.sans,
    color: color.text.secondary,
    fontSize: typography.size.sm,
  },
});
