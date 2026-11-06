import { Text, type TextProps, StyleSheet } from "react-native";
import { brand, color, typography } from "@klimacin/config";

type BrandMarkProps = TextProps & {
  size?: "sm" | "md" | "lg" | "hero";
  /** chalk = on dark night plane; ink = on light surfaces */
  tone?: "chalk" | "ink";
};

const sizeMap = {
  sm: typography.size.lg,
  md: typography.size["2xl"],
  lg: typography.size["3xl"],
  hero: typography.size.hero,
} as const;

export function BrandMark({
  size = "md",
  tone = "ink",
  style,
  ...rest
}: BrandMarkProps) {
  return (
    <Text
      accessibilityRole="header"
      style={[
        styles.mark,
        { fontSize: sizeMap[size] },
        tone === "chalk" ? styles.chalk : styles.ink,
        style,
      ]}
      {...rest}
    >
      {brand.name}
    </Text>
  );
}

const styles = StyleSheet.create({
  mark: {
    fontFamily: typography.fontFamily.display,
    fontWeight: "700",
    letterSpacing: -1.2,
  },
  chalk: {
    color: color.text.primary,
  },
  ink: {
    color: color.brand.ink,
  },
});
