import { brand, serviceCategories } from "@klimacin/config";
import { BrandMark, EmptyState } from "@klimacin/ui";
import Link from "next/link";

export default function AdminRegionsPage() {
  return (
    <main className="kk-page" style={{ padding: "2.5rem 1.25rem 4rem" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", display: "grid", gap: "1.5rem" }}>
        <Link href="/" style={{ color: "var(--kk-brand-mid)", textDecoration: "none" }}>
          ← {brand.name}
        </Link>
        <BrandMark as="h1" size="lg" />
        <h2 style={{ margin: 0 }}>Bölge ve kategori</h2>
        <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
          TR il/ilçe bazında hizmet aç/kapa. Hizmet dışı bölgede kesin randevu
          oluşturulmaz. Kategoriler:{" "}
          {serviceCategories.map((c) => c.label).join(", ")}.
        </p>
        <EmptyState title="Bölge verisi bağlı değil">
          service_regions tablosu migration ile tanımlandı; yönetim UI Auth
          sonrası doldurulacak.
        </EmptyState>
      </div>
    </main>
  );
}
