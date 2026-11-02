import { Text, type TextProps, StyleSheet } from "react-native";
import { brand, color, typography } from "@klimacin/config";

type BrandMarkProps = TextProps & {
  size?: "sm" | "md" | "lg" | "hero";
};

const sizeMap = {
  sm: typography.size.lg,
  md: typography.size["2xl"],
  lg: typography.size["3xl"],
  hero: typography.size.hero,
} as const;

export function BrandMark({ size = "md", style, ...rest }: BrandMarkProps) {
  return (
    <Text
      accessibilityRole="header"
      style={[styles.mark, { fontSize: sizeMap[size] }, style]}
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
    color: color.brand.ink,
    letterSpacing: -0.4,
  },
});
