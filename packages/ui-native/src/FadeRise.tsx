import { useEffect, useRef, type ReactNode } from "react";
import { Animated, type ViewStyle } from "react-native";
import { motion } from "@klimacin/config";

type Props = {
  children: ReactNode;
  delay?: number;
  style?: ViewStyle;
};

/** Intentional entrance: soft rise + fade (hero hierarchy, not noise). */
export function FadeRise({ children, delay = 0, style }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.slow,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: motion.slow,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}
