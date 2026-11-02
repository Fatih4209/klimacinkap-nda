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

export default function App() {
  const [fontsLoaded] = useFonts({
    Fraunces: Fraunces_700Bold,
    Manrope: Manrope_400Regular,
    "Manrope-SemiBold": Manrope_600SemiBold,
    "Manrope-Bold": Manrope_700Bold,
  });
  const [bootNote, setBootNote] = useState<string | null>(null);
  const [activeFlow, setActiveFlow] = useState<"home" | "klima">("home");
  const [categoryNote, setCategoryNote] = useState<string | null>(null);

  useEffect(() => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!url) {
      setBootNote(
        "Supabase henüz bağlanmadı. Hesap, adres ve sipariş akışları anahtarlar eklendikten sonra açılacak.",
      );
    }
  }, []);

  function onSelectCategory(id: ServiceCategoryId) {
    if (id === "klima") {
      setActiveFlow("klima");
      setCategoryNote(null);
      return;
    }
    setCategoryNote(
      id === "su"
        ? "Damacana su siparişi faz (d) kapsamında. Sahte akış yok."
        : "Tüp siparişi faz (d) kapsamında. Sahte akış yok.",
    );
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

            {categoryNote ? (
              <EmptyState title="Yakında" body={categoryNote} />
            ) : null}

            <EmptyState
              title="Hesabınız henüz yok"
              body={`SMS ile ${roleLabelsTr.customer.toLowerCase()} kaydı Supabase Auth bağlandığında etkinleşir. Sahte giriş yok.`}
            />

            {bootNote ? (
              <EmptyState title="Bağımlılık" body={bootNote} />
            ) : null}
          </>
        ) : (
          <KlimaFlow onBack={() => setActiveFlow("home")} />
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
    gap: space[3],
  },
  slogan: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.lg,
    lineHeight: typography.size.lg * typography.lineHeight.snug,
    color: color.text.secondary,
  },
});
