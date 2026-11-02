import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Fraunces_700Bold, useFonts } from "@expo-google-fonts/fraunces";
import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import { brand, color, space, typography } from "@klimacin/config";
import { roleLabelsTr } from "@klimacin/shared";
import { BrandMark, EmptyState, Screen } from "@klimacin/ui-native";

/**
 * Staff app — separate entry from customer.
 * No background location on this screen; location only when assigned job requires it (phase e).
 */
export default function App() {
  const [fontsLoaded] = useFonts({
    Fraunces: Fraunces_700Bold,
    Manrope: Manrope_400Regular,
    "Manrope-SemiBold": Manrope_600SemiBold,
    "Manrope-Bold": Manrope_700Bold,
  });
  const [bootNote, setBootNote] = useState<string | null>(null);

  useEffect(() => {
    if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
      setBootNote(
        "Personel girişi ve görev listesi için Supabase bağlantısı gerekli. Davet ile hesap açılır; açık kayıt yok.",
      );
    }
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={color.brand.deep} />
      </View>
    );
  }

  return (
    <Screen>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <BrandMark size="lg" />
          <Text style={styles.kicker}>{roleLabelsTr.field_staff}</Text>
          <Text style={styles.slogan}>
            Atanan işler, durum güncelleme ve tamamlama — {brand.name}
          </Text>
        </View>

        <EmptyState
          title="Atanmış iş yok"
          body="Görevler işletme panelinden atandığında burada görünür. Konum izni yalnızca aktif iş takibi için istenir."
        />

        {bootNote ? <EmptyState title="Bağımlılık" body={bootNote} /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surface.base,
  },
  content: {
    gap: space[6],
    paddingBottom: space[10],
  },
  hero: {
    gap: space[2],
  },
  kicker: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: "600",
    color: color.brand.mid,
    fontSize: typography.size.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  slogan: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.lg,
    lineHeight: typography.size.lg * typography.lineHeight.snug,
    color: color.text.secondary,
  },
});
