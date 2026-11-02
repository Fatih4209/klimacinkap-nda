import { brand } from "@klimacin/config";
import { roleLabelsTr } from "@klimacin/shared";
import { BrandMark, EmptyState } from "@klimacin/ui";
import Link from "next/link";

export default function BusinessAccountPage() {
  return (
    <main className="kk-page" style={{ padding: "2.5rem 1.25rem 4rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "grid", gap: "1.5rem" }}>
        <Link href="/" style={{ color: "var(--kk-brand-mid)", textDecoration: "none" }}>
          ← {brand.name}
        </Link>
        <BrandMark as="h1" size="lg" />
        <h2 style={{ margin: 0 }}>Hesap</h2>
        <EmptyState title={`${roleLabelsTr.business_owner} oturumu yok`}>
          SMS ile giriş Supabase Auth bağlandığında çalışır. Demo rol değiştirici
          veya auth bypass yoktur.
        </EmptyState>
        <p style={{ margin: 0 }}>
          <Link href="/gizlilik">Gizlilik</Link>
          {" · "}
          <Link href="/hesap-silme">Hesap silme talebi</Link>
        </p>
      </div>
    </main>
  );
}
