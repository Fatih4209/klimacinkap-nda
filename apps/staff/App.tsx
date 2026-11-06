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
import { brand, color, motion, space, typography } from "@klimacin/config";
import { roleLabelsTr } from "@klimacin/shared";
import {
  BrandMark,
  EmptyState,
  FadeRise,
  Screen,
} from "@klimacin/ui-native";
import { StaffJobsScreen } from "./src/StaffJobsScreen";
import { StaffAccountScreen } from "./src/account/AccountScreen";
import { useStaffDeepLink } from "./src/linking";
import { StaffSmsOtpScreen } from "./src/auth/SmsOtpScreen";
import { AcceptInviteScreen } from "./src/invite/AcceptInviteScreen";

/**
 * Staff app — premium field shell, separate from customer.
 * Location only while assignment is en_route/on_site.
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
    if (deepLink?.kind === "assignment" || deepLink?.kind === "invite") {
      setShowAccount(false);
    }
  }, [deepLink]);

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={color.brand.glow} />
      </View>
    );
  }

  return (
    <Screen bleed tone="night">
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {showAccount ? (
          <View style={styles.pad}>
            <StaffAccountScreen onBack={() => setShowAccount(false)} />
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <FadeRise delay={0}>
                <Text style={styles.kicker}>{roleLabelsTr.field_staff}</Text>
              </FadeRise>
              <FadeRise delay={motion.fast}>
                <BrandMark size="hero" tone="chalk" style={styles.brand} />
              </FadeRise>
              <FadeRise delay={motion.base}>
                <Text style={styles.slogan}>
                  Atanan işler, durum ve güvenli konum — {brand.name}
                </Text>
              </FadeRise>
              <FadeRise delay={motion.base + motion.stagger}>
                <Pressable
                  onPress={() => setShowAccount(true)}
                  style={styles.accountBtn}
                >
                  <Text style={styles.accountBtnText}>Hesap · Gizlilik</Text>
                </Pressable>
              </FadeRise>
            </View>

            <View style={styles.pad}>
              <StaffSmsOtpScreen />
              <AcceptInviteScreen />
              <StaffJobsScreen />
              {bootNote ? (
                <EmptyState title="Bağımlılık" body={bootNote} />
              ) : null}
            </View>
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
    backgroundColor: color.brand.night,
  },
  content: {
    gap: space[6],
    paddingBottom: space[10],
    flexGrow: 1,
  },
  hero: {
    paddingHorizontal: space[5],
    paddingTop: space[8],
    paddingBottom: space[7],
    gap: space[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border.subtle,
  },
  kicker: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: "700",
    color: color.brand.glow,
    fontSize: typography.size.xs,
    textTransform: "uppercase",
    letterSpacing: 1.6,
  },
  brand: { maxWidth: 320 },
  slogan: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.lg,
    lineHeight: typography.size.lg * typography.lineHeight.snug,
    color: color.text.secondary,
    maxWidth: 340,
  },
  accountBtn: {
    alignSelf: "flex-start",
    marginTop: space[2],
    borderBottomWidth: 1,
    borderBottomColor: color.brand.glow,
    paddingBottom: space[1],
  },
  accountBtnText: {
    fontFamily: typography.fontFamily.sans,
    color: color.text.primary,
    fontWeight: "700",
    fontSize: typography.size.sm,
    letterSpacing: 0.4,
  },
  pad: {
    paddingHorizontal: space[5],
    gap: space[6],
  },
});
