import { brand } from "@klimacin/config";
import { BrandMark } from "@klimacin/ui";
import Link from "next/link";
import { KpiClient } from "./KpiClient";

export default function BusinessKpiPage() {
  return (
    <main className="kk-page" style={{ padding: "2.5rem 1.25rem 4rem" }}>
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          display: "grid",
          gap: "1.5rem",
        }}
      >
        <Link
          href="/"
          style={{ color: "var(--kk-brand-mid)", textDecoration: "none" }}
        >
          ← {brand.name}
        </Link>
        <BrandMark as="h1" size="lg" />
        <h2 style={{ margin: 0 }}>İşletme KPI</h2>
        <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
          Sayılar gerçek tablolardan; oturum/env yoksa boş dürüst durum.
        </p>
        <KpiClient />
      </div>
    </main>
  );
}
