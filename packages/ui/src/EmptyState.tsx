import type { ReactNode } from "react";

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="kk-empty" role="status">
      <strong style={{ display: "block", marginBottom: "0.35rem" }}>
        {title}
      </strong>
      {children}
    </div>
  );
}
