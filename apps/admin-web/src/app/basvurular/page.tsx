import { brand } from "@klimacin/config";
import { BrandMark, EmptyState } from "@klimacin/ui";
import Link from "next/link";

export default function AdminApplicationsPage() {
  return (
    <main className="kk-page" style={{ padding: "2.5rem 1.25rem 4rem" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", display: "grid", gap: "1.5rem" }}>
        <Link href="/" style={{ color: "var(--kk-brand-mid)", textDecoration: "none" }}>
          ← {brand.name}
        </Link>
        <BrandMark as="h1" size="lg" />
        <h2 style={{ margin: 0 }}>İşletme başvuruları</h2>
        <EmptyState title="Liste boş / bağlantı yok">
          Başvurular veritabanından okunacak. Sahte işletme veya otomatik onay
          yoktur. Kategori bazlı (özellikle tüp bayi) onay zorunludur.
        </EmptyState>
      </div>
    </main>
  );
}
