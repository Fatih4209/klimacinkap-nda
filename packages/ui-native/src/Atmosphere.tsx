import { StyleSheet, View, type ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { color } from "@klimacin/config";

type Props = ViewProps & {
  /** night = full-bleed dark hero plane; chalk = light content sheet */
  tone?: "night" | "chalk";
};

/**
 * Atmospheric plane — not a flat fill. Used as the product’s visual ground.
 */
export function Atmosphere({
  tone = "night",
  style,
  children,
  ...rest
}: Props) {
  if (tone === "chalk") {
    return (
      <View style={[styles.chalk, style]} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.root, style]} {...rest}>
      <LinearGradient
        colors={[color.brand.night, color.brand.ink, color.brand.deep]}
        locations={[0, 0.45, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(46,196,206,0.22)", "transparent", "rgba(61,159,212,0.12)"]}
        locations={[0, 0.4, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.haze} pointerEvents="none" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.brand.night,
    overflow: "hidden",
  },
  chalk: {
    flex: 1,
    backgroundColor: color.surface.chalk,
  },
  haze: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "transparent",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border.subtle,
  },
});
