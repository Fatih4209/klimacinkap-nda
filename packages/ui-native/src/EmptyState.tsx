import { StyleSheet, Text, View } from "react-native";
import { color, space, typography } from "@klimacin/config";

export function EmptyState({
  title,
  body,
  tone = "night",
}: {
  title: string;
  body?: string;
  tone?: "night" | "chalk";
}) {
  const night = tone === "night";
  return (
    <View
      style={[styles.box, night ? styles.boxNight : styles.boxChalk]}
      accessibilityRole="text"
    >
      <Text style={[styles.title, night ? styles.titleNight : styles.titleChalk]}>
        {title}
      </Text>
      {body ? (
        <Text style={[styles.body, night ? styles.bodyNight : styles.bodyChalk]}>
          {body}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    paddingVertical: space[4],
    paddingHorizontal: space[1],
    gap: space[2],
  },
  boxNight: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border.subtle,
  },
  boxChalk: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(4,22,28,0.12)",
  },
  title: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: "600",
    fontSize: typography.size.md,
  },
  titleNight: { color: color.text.primary },
  titleChalk: { color: color.text.onChalk },
  body: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.sm,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  bodyNight: { color: color.text.secondary },
  bodyChalk: { color: color.text.onChalkSecondary },
});
