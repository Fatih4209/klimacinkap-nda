/**
 * Design tokens — platform-agnostic. Web and native map these to CSS / StyleSheet.
 * Direction: cool service trust (deep teal + chalk air), not purple/cream defaults.
 */
export const color = {
  brand: {
    ink: "#0B2C34",
    deep: "#0E4A56",
    mid: "#1A6B78",
    soft: "#D7ECF0",
    mist: "#EEF6F8",
  },
  klima: {
    solid: "#1F7AAD",
    soft: "#D6EAF6",
  },
  su: {
    solid: "#1A9A8C",
    soft: "#D4F0EC",
  },
  tup: {
    solid: "#C46A2D",
    soft: "#F6E4D6",
  },
  surface: {
    base: "#F3F7F8",
    raised: "#FFFFFF",
    sunken: "#E6EEF0",
  },
  text: {
    primary: "#0F1C24",
    secondary: "#4A5C66",
    muted: "#6E818A",
    inverse: "#F7FBFC",
  },
  border: {
    subtle: "#D2DEE2",
    strong: "#A8BCC3",
  },
  state: {
    success: "#1F7A4D",
    warning: "#B7791F",
    danger: "#B42318",
    info: "#1F6FEB",
  },
} as const;

export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48,
  10: 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const typography = {
  fontFamily: {
    display: "Fraunces",
    sans: "Manrope",
    mono: "IBM Plex Mono",
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    "2xl": 28,
    "3xl": 36,
    hero: 44,
  },
  lineHeight: {
    tight: 1.15,
    snug: 1.3,
    normal: 1.5,
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
} as const;

export const motion = {
  fast: 160,
  base: 280,
  slow: 420,
} as const;

export const categoryAccent = {
  klima: color.klima,
  su: color.su,
  tup: color.tup,
} as const;
