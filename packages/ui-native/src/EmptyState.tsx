import { StyleSheet, Text, View } from "react-native";
import { color, radius, space, typography } from "@klimacin/config";

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body?: string;
}) {
  return (
    <View style={styles.box} accessibilityRole="text">
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: color.border.subtle,
    borderRadius: radius.md,
    padding: space[5],
    backgroundColor: color.brand.mist,
    gap: space[2],
  },
  title: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: "600",
    color: color.text.primary,
  },
  body: {
    color: color.text.secondary,
    fontSize: typography.size.sm,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
});
