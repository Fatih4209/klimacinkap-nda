import type { CSSProperties } from "react";
import { brand } from "@klimacin/config";

type BrandMarkProps = {
  as?: "h1" | "p" | "span";
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
  style?: CSSProperties;
};

const sizes: Record<NonNullable<BrandMarkProps["size"]>, string> = {
  sm: "1.125rem",
  md: "1.5rem",
  lg: "2rem",
  hero: "clamp(2.4rem, 5vw, 3.4rem)",
};

export function BrandMark({
  as: Tag = "p",
  size = "md",
  className,
  style,
}: BrandMarkProps) {
  return (
    <Tag
      className={["kk-brand-mark", className].filter(Boolean).join(" ")}
      style={{ fontSize: sizes[size], lineHeight: 1.1, margin: 0, ...style }}
    >
      {brand.name}
    </Tag>
  );
}
