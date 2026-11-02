import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import {
  categoryAccent,
  color,
  radius,
  serviceCategories,
  space,
  typography,
  type ServiceCategoryId,
} from "@klimacin/config";

type Props = {
  onSelect?: (id: ServiceCategoryId) => void;
  style?: ViewStyle;
  footerNote?: string;
};

export function ServiceCategoryGrid({ onSelect, style, footerNote }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.grid}>
        {serviceCategories.map((category) => {
          const accent = categoryAccent[category.id];
          return (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityLabel={category.label}
              disabled={!onSelect}
              onPress={() => onSelect?.(category.id)}
              style={({ pressed }) => [
                styles.tile,
                { borderTopColor: accent.solid, opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Text style={styles.title}>{category.label}</Text>
              <Text style={styles.desc}>{category.description}</Text>
            </Pressable>
          );
        })}
      </View>
      {footerNote ? <Text style={styles.note}>{footerNote}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[4] },
  grid: { gap: space[3] },
  tile: {
    backgroundColor: color.surface.raised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderTopWidth: 3,
    padding: space[5],
    gap: space[2],
  },
  title: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.xl,
    fontWeight: "700",
    color: color.text.primary,
  },
  desc: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.md,
    color: color.text.secondary,
    lineHeight: typography.size.md * typography.lineHeight.normal,
  },
  note: {
    fontSize: typography.size.sm,
    color: color.text.muted,
  },
});
