import { useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import {
  categoryAccent,
  color,
  motion,
  serviceCategories,
  space,
  typography,
  type ServiceCategoryId,
} from "@klimacin/config";
import { FadeRise } from "./FadeRise";

type Props = {
  onSelect?: (id: ServiceCategoryId) => void;
  style?: ViewStyle;
  footerNote?: string;
  /** night = chalk type on dark plane (home hero); chalk = dark type on light */
  tone?: "night" | "chalk";
};

/**
 * Equal-weight Klima / Su / Tüp — not a card grid.
 * Full-bleed interactive bands with accent rails; hierarchy is typography + color.
 */
export function ServiceCategoryGrid({
  onSelect,
  style,
  footerNote,
  tone = "night",
}: Props) {
  const night = tone === "night";

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.grid}>
        {serviceCategories.map((category, index) => {
          const accent = categoryAccent[category.id];
          return (
            <FadeRise key={category.id} delay={motion.base + index * motion.stagger}>
              <CategoryBand
                label={category.label}
                description={category.description}
                accent={accent.solid}
                night={night}
                disabled={!onSelect}
                onPress={() => onSelect?.(category.id)}
              />
            </FadeRise>
          );
        })}
      </View>
      {footerNote ? (
        <Text style={[styles.note, night ? styles.noteNight : null]}>
          {footerNote}
        </Text>
      ) : null}
    </View>
  );
}

function CategoryBand({
  label,
  description,
  accent,
  night,
  disabled,
  onPress,
}: {
  label: string;
  description: string;
  accent: string;
  night: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(scale, {
      toValue: 0.985,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  }

  function pressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 28,
      bounciness: 4,
    }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[
          styles.band,
          night ? styles.bandNight : styles.bandChalk,
          { borderLeftColor: accent },
        ]}
      >
        <View style={styles.bandCopy}>
          <Text style={[styles.title, night ? styles.titleNight : styles.titleChalk]}>
            {label}
          </Text>
          <Text
            style={[styles.desc, night ? styles.descNight : styles.descChalk]}
          >
            {description}
          </Text>
        </View>
        <Text style={[styles.chevron, { color: accent }]}>→</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[4] },
  grid: { gap: space[3] },
  band: {
    minHeight: 92,
    paddingVertical: space[5],
    paddingHorizontal: space[5],
    borderLeftWidth: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: space[4],
  },
  bandNight: {
    backgroundColor: color.surface.panel,
  },
  bandChalk: {
    backgroundColor: "rgba(4,22,28,0.04)",
  },
  bandCopy: { flex: 1, gap: space[1] },
  title: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size.xl,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  titleNight: { color: color.text.primary },
  titleChalk: { color: color.text.onChalk },
  desc: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.sm,
    lineHeight: typography.size.sm * typography.lineHeight.snug,
  },
  descNight: { color: color.text.secondary },
  descChalk: { color: color.text.onChalkSecondary },
  chevron: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size["2xl"],
    fontWeight: "700",
  },
  note: {
    fontSize: typography.size.sm,
    color: color.text.muted,
  },
  noteNight: { color: color.text.muted },
});
