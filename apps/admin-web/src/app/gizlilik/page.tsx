import { brand } from "@klimacin/config";
import {
  DATA_CATEGORIES,
  PRIVACY_CONTACT_PLACEHOLDER,
} from "@klimacin/shared";
import { BrandMark } from "@klimacin/ui";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Gizlilik — ${brand.name} Yönetim`,
  description: `${brand.name} veri kategorileri (yönetim paneli).`,
};

export default function AdminPrivacyPage() {
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
          ← Yönetim
        </Link>
        <BrandMark as="h1" size="lg" />
        <h2 style={{ margin: 0 }}>Gizlilik özeti (yönetim)</h2>
        <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
          Platform admin olarak erişilen tablolar da aynı şema sınırındadır. Kart
          verisi DB’de yoktur. DNS/yayın bu repoda yapılmaz.
        </p>
        {DATA_CATEGORIES.map((cat) => (
          <article
            key={cat.id}
            style={{
              display: "grid",
              gap: "0.35rem",
              paddingBottom: "0.75rem",
              borderBottom: "1px solid var(--kk-border-subtle)",
            }}
          >
            <strong>{cat.titleTr}</strong>
            <span style={{ color: "var(--kk-text-secondary)" }}>
              {cat.fieldsTr}
            </span>
          </article>
        ))}
        <p style={{ margin: 0, color: "var(--kk-text-muted)", fontSize: "0.9rem" }}>
          {PRIVACY_CONTACT_PLACEHOLDER}
        </p>
      </div>
    </main>
  );
}
