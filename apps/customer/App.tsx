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
import {
  brand,
  color,
  space,
  typography,
  type ServiceCategoryId,
} from "@klimacin/config";
import { roleLabelsTr } from "@klimacin/shared";
import {
  BrandMark,
  EmptyState,
  Screen,
  ServiceCategoryGrid,
} from "@klimacin/ui-native";
import { KlimaFlow } from "./src/klima/KlimaFlow";
import { CatalogOrderFlow } from "./src/catalog/CatalogOrderFlow";
import { NotificationsHub } from "./src/notify/NotificationsHub";

type ActiveFlow = "home" | "klima" | "su" | "tup" | "notify";

export default function App() {
  const [fontsLoaded] = useFonts({
    Fraunces: Fraunces_700Bold,
    Manrope: Manrope_400Regular,
    "Manrope-SemiBold": Manrope_600SemiBold,
    "Manrope-Bold": Manrope_700Bold,
  });
  const [bootNote, setBootNote] = useState<string | null>(null);
  const [activeFlow, setActiveFlow] = useState<ActiveFlow>("home");

  useEffect(() => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!url) {
      setBootNote(
        "Supabase henüz bağlanmadı. Hesap, adres ve sipariş akışları anahtarlar eklendikten sonra açılacak.",
      );
    }
  }, []);

  function onSelectCategory(id: ServiceCategoryId) {
    setActiveFlow(id);
  }

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
        {activeFlow === "home" ? (
          <>
            <View style={styles.hero}>
              <BrandMark size="hero" />
              <Text style={styles.slogan}>{brand.slogan}</Text>
            </View>

            <ServiceCategoryGrid onSelect={onSelectCategory} />

            <Pressable
              onPress={() => setActiveFlow("notify")}
              style={styles.notifyBtn}
            >
              <Text style={styles.notifyBtnText}>
                Bildirimler · Mesajlar · Sorunlar
              </Text>
            </Pressable>

            <EmptyState
              title="Hesabınız henüz yok"
              body={`SMS ile ${roleLabelsTr.customer.toLowerCase()} kaydı Supabase Auth bağlandığında etkinleşir. Sahte giriş yok.`}
            />

            {bootNote ? (
              <EmptyState title="Bağımlılık" body={bootNote} />
            ) : null}
          </>
        ) : null}

        {activeFlow === "klima" ? (
          <KlimaFlow onBack={() => setActiveFlow("home")} />
        ) : null}

        {activeFlow === "su" ? (
          <CatalogOrderFlow
            category="su"
            onBack={() => setActiveFlow("home")}
          />
        ) : null}

        {activeFlow === "tup" ? (
          <CatalogOrderFlow
            category="tup"
            onBack={() => setActiveFlow("home")}
          />
        ) : null}

        {activeFlow === "notify" ? (
          <NotificationsHub onBack={() => setActiveFlow("home")} />
        ) : null}
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
    gap: space[3],
  },
  slogan: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.lg,
    lineHeight: typography.size.lg * typography.lineHeight.snug,
    color: color.text.secondary,
  },
  notifyBtn: {
    borderWidth: 1,
    borderColor: color.brand.mid,
    borderRadius: 999,
    paddingVertical: space[3],
    alignItems: "center",
  },
  notifyBtnText: {
    color: color.brand.deep,
    fontWeight: "700",
  },
});
