import { SafeAreaView, StyleSheet, View, type ViewProps } from "react-native";
import { color, space } from "@klimacin/config";
import { Atmosphere } from "./Atmosphere";

type Props = ViewProps & {
  /** night = premium dark atmosphere (default); chalk = light sheet */
  tone?: "night" | "chalk";
  /** Edge-to-edge content (home hero). Default pads for forms. */
  bleed?: boolean;
};

export function Screen({
  tone = "night",
  bleed = false,
  style,
  children,
  ...rest
}: Props) {
  return (
    <Atmosphere tone={tone} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View
          style={[bleed ? styles.bleed : styles.padded, style]}
          {...rest}
        >
          {children}
        </View>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: {
    flex: 1,
    paddingHorizontal: space[5],
    paddingTop: space[5],
    paddingBottom: space[6],
    gap: space[5],
  },
  bleed: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
});
