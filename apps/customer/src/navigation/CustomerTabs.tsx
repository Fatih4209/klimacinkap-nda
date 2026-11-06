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
            style={styles.tab}
          >
            <Text style={[styles.label, selected ? styles.labelActive : null]}>
              {tab.label}
            </Text>
            {selected ? <View style={styles.dot} /> : <View style={styles.dotGhost} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: color.brand.ink,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border.subtle,
    paddingBottom: space[3],
    paddingTop: space[3],
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: space[1],
    paddingVertical: space[1],
  },
  label: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.xs,
    color: color.text.muted,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  labelActive: {
    color: color.text.primary,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: color.brand.glow,
  },
  dotGhost: {
    width: 5,
    height: 5,
  },
});
