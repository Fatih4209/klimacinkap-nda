import { Pressable, StyleSheet, Text, View } from "react-native";
import { color, space, typography } from "@klimacin/config";

export type CustomerTab = "home" | "orders" | "notify" | "account";

const TABS: { id: CustomerTab; label: string }[] = [
  { id: "home", label: "Ana" },
  { id: "orders", label: "Siparişler" },
  { id: "notify", label: "Bildirimler" },
  { id: "account", label: "Hesap" },
];

type Props = {
  active: CustomerTab;
  onChange: (tab: CustomerTab) => void;
};

export function CustomerTabs({ active, onChange }: Props) {
  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.id)}
            style={[styles.tab, selected ? styles.tabActive : null]}
          >
            <Text style={[styles.label, selected ? styles.labelActive : null]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: color.border.subtle,
    backgroundColor: color.surface.raised,
    paddingBottom: space[2],
    paddingTop: space[2],
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: space[2],
  },
  tabActive: {
    borderTopWidth: 2,
    borderTopColor: color.brand.deep,
    marginTop: -1,
  },
  label: {
    fontSize: typography.size.xs,
    color: color.text.muted,
    fontWeight: "600",
  },
  labelActive: {
    color: color.brand.deep,
  },
});
