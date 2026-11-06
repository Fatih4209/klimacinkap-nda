/**
 * Design tokens — platform-agnostic. Web and native map these to CSS / StyleSheet.
 * Direction: deep service night (ink teal + chalk air + graphite), diamond clarity.
 * Avoid purple gradients, cream+terracotta brochure, and flat white dashboards.
 */
export const color = {
  brand: {
    ink: "#04161C",
    deep: "#0A3A44",
    mid: "#1B7A88",
    soft: "#9FD0D8",
    mist: "#E8F4F6",
    night: "#021015",
    glow: "#2EC4CE",
  },
  klima: {
    solid: "#3D9FD4",
    soft: "#12384A",
  },
  su: {
    solid: "#2BB5A4",
    soft: "#0F3A36",
  },
  tup: {
    solid: "#D4A15C",
    soft: "#3A2E1A",
  },
  surface: {
    base: "#071820",
    raised: "#0D2430",
    sunken: "#041018",
    chalk: "#F4FAFB",
    panel: "rgba(244,250,251,0.06)",
  },
  text: {
    primary: "#F4FAFB",
    secondary: "#A8C0C8",
    muted: "#6F8A94",
    /** On solid brand / accent fills */
    inverse: "#F4FAFB",
    onChalk: "#0F1C24",
    onChalkSecondary: "#4A5C66",
  },
  border: {
    subtle: "rgba(244,250,251,0.12)",
    strong: "rgba(244,250,251,0.28)",
  },
  state: {
    success: "#3DB87A",
    warning: "#D4A017",
    danger: "#E05244",
    info: "#4B9EFF",
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
  md: 14,
  lg: 20,
  xl: 28,
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
    "2xl": 30,
    "3xl": 40,
    hero: 52,
  },
  lineHeight: {
    tight: 1.08,
    snug: 1.25,
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
  fast: 180,
  base: 320,
  slow: 520,
  stagger: 90,
} as const;

export const categoryAccent = {
  klima: color.klima,
  su: color.su,
  tup: color.tup,
} as const;
