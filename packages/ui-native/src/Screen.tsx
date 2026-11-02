import { SafeAreaView, StyleSheet, View, type ViewProps } from "react-native";
import { color, space } from "@klimacin/config";

export function Screen({ style, children, ...rest }: ViewProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.inner, style]} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.surface.base,
  },
  inner: {
    flex: 1,
    paddingHorizontal: space[5],
    paddingTop: space[6],
    paddingBottom: space[7],
    gap: space[5],
  },
});
