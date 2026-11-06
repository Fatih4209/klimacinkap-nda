import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Fraunces_700Bold, useFonts } from "@expo-google-fonts/fraunces";
import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import { color, space, type ServiceCategoryId } from "@klimacin/config";
import { Screen } from "@klimacin/ui-native";
import { KlimaFlow } from "./src/klima/KlimaFlow";
import { CatalogOrderFlow } from "./src/catalog/CatalogOrderFlow";
import { NotificationsHub } from "./src/notify/NotificationsHub";
import { AccountScreen } from "./src/account/AccountScreen";
import { useCustomerDeepLink } from "./src/linking";
import {
  CustomerTabs,
  type CustomerTab,
} from "./src/navigation/CustomerTabs";
import { HomeScreen } from "./src/home/HomeScreen";
import { OrdersScreen } from "./src/orders/OrdersScreen";

type ActiveFlow = "tabs" | "klima" | "su" | "tup";

export default function App() {
  const [fontsLoaded] = useFonts({
    Fraunces: Fraunces_700Bold,
    Manrope: Manrope_400Regular,
    "Manrope-SemiBold": Manrope_600SemiBold,
    "Manrope-Bold": Manrope_700Bold,
  });
  const [tab, setTab] = useState<CustomerTab>("home");
  const [flow, setFlow] = useState<ActiveFlow>("tabs");
  const [focusOrderId, setFocusOrderId] = useState<string | null>(null);
  const deepLink = useCustomerDeepLink();

  useEffect(() => {
    if (!deepLink) return;
    if (deepLink.kind === "privacy" || deepLink.kind === "accountDeletion") {
      setFlow("tabs");
      setTab("account");
    } else if (deepLink.kind === "klimaRequest") {
      setFlow("klima");
    } else if (deepLink.kind === "productOrder") {
      setFocusOrderId(deepLink.orderId);
      if (deepLink.category === "tup") {
        setFlow("tup");
      } else if (deepLink.category === "su") {
        setFlow("su");
      } else {
        // Category unknown — open orders list (honest; no invent su)
        setFlow("tabs");
        setTab("orders");
      }
    }
  }, [deepLink]);

  function onSelectCategory(id: ServiceCategoryId) {
    setFlow(id);
  }

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={color.brand.deep} />
      </View>
    );
  }

  const showTabs = flow === "tabs";

  return (
    <Screen>
      <StatusBar style="dark" />
      <View style={styles.shell}>
        <ScrollView contentContainerStyle={styles.content}>
          {showTabs && tab === "home" ? (
            <HomeScreen
              onSelectCategory={onSelectCategory}
              onOpenOrders={() => setTab("orders")}
              onOpenAccount={() => setTab("account")}
            />
          ) : null}
          {showTabs && tab === "orders" ? (
            <OrdersScreen focusOrderId={focusOrderId} />
          ) : null}
          {showTabs && tab === "notify" ? (
            <NotificationsHub onBack={() => setTab("home")} />
          ) : null}
          {showTabs && tab === "account" ? (
            <AccountScreen onBack={() => setTab("home")} />
          ) : null}

          {flow === "klima" ? (
            <KlimaFlow onBack={() => setFlow("tabs")} />
          ) : null}
          {flow === "su" ? (
            <CatalogOrderFlow category="su" onBack={() => setFlow("tabs")} />
          ) : null}
          {flow === "tup" ? (
            <CatalogOrderFlow category="tup" onBack={() => setFlow("tabs")} />
          ) : null}
        </ScrollView>
        {showTabs ? <CustomerTabs active={tab} onChange={setTab} /> : null}
      </View>
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
  shell: { flex: 1 },
  content: {
    gap: space[6],
    paddingBottom: space[10],
    flexGrow: 1,
  },
});
