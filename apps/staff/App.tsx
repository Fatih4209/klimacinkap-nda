import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
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
import { StaffJobsScreen } from "./src/StaffJobsScreen";
import { StaffAccountScreen } from "./src/account/AccountScreen";
import { useStaffDeepLink } from "./src/linking";
import { StaffSmsOtpScreen } from "./src/auth/SmsOtpScreen";
import { AcceptInviteScreen } from "./src/invite/AcceptInviteScreen";

/**
 * Staff app — separate entry from customer.
 * Location is requested only while an assignment is en_route/on_site (phase e).
 * No simulated locations; stale pings are never labeled live by the API.
 */
export default function App() {
  const [fontsLoaded] = useFonts({
    Fraunces: Fraunces_700Bold,
    Manrope: Manrope_400Regular,
    "Manrope-SemiBold": Manrope_600SemiBold,
    "Manrope-Bold": Manrope_700Bold,
  });
  const [bootNote, setBootNote] = useState<string | null>(null);
  const [showAccount, setShowAccount] = useState(false);
  const deepLink = useStaffDeepLink();

  useEffect(() => {
    if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
      setBootNote(
        "Personel girişi ve görev listesi için Supabase bağlantısı gerekli. Davet ile hesap açılır; açık kayıt yok.",
      );
    }
  }, []);

  useEffect(() => {
    if (deepLink?.kind === "assignment") {
      setShowAccount(false);
    }
  }, [deepLink]);

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
        {showAccount ? (
          <StaffAccountScreen onBack={() => setShowAccount(false)} />
        ) : (
          <>
            <View style={styles.hero}>
              <BrandMark size="lg" />
              <Text style={styles.kicker}>{roleLabelsTr.field_staff}</Text>
              <Text style={styles.slogan}>
                Atanan işler, durum, canlı konum ve tamamlama kodu — {brand.name}
              </Text>
            </View>

            <Pressable
              onPress={() => setShowAccount(true)}
              style={styles.accountBtn}
            >
              <Text style={styles.accountBtnText}>Hesap · Gizlilik</Text>
            </Pressable>

            <StaffSmsOtpScreen />
            <AcceptInviteScreen />
            <StaffJobsScreen />

            {bootNote ? (
              <EmptyState title="Bağımlılık" body={bootNote} />
            ) : null}
          </>
        )}
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
  accountBtn: {
    borderWidth: 1,
    borderColor: color.brand.mid,
    borderRadius: 999,
    paddingVertical: space[3],
    alignItems: "center",
  },
  accountBtnText: {
    color: color.brand.deep,
    fontWeight: "700",
  },
});
