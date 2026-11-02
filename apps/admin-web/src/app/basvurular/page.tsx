import { brand } from "@klimacin/config";
import { BrandMark } from "@klimacin/ui";
import Link from "next/link";
import { ApplicationsReviewClient } from "./ApplicationsReviewClient";

export default function AdminApplicationsPage() {
  return (
    <main className="kk-page" style={{ padding: "2.5rem 1.25rem 4rem" }}>
      <div
        style={{
          maxWidth: 800,
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
        <h2 style={{ margin: 0 }}>İşletme başvuruları</h2>
        <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
          Kategori bazlı onay zorunlu. Otomatik onay / sahte işletme yok. İlk
          admin için <Link href="/bootstrap">güvenli bootstrap</Link> kullanın —
          açık kayıt yok.
        </p>
        <ApplicationsReviewClient />
      </div>
    </main>
  );
}
