import { brand } from "@klimacin/config";
import { BrandMark, EmptyState } from "@klimacin/ui";
import Link from "next/link";
import { StaffAdminClient } from "./StaffAdminClient";

export default function StaffAdminPage() {
  const supabaseReady = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  return (
    <main className="kk-page" style={{ padding: "2.5rem 1.25rem 4rem" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", display: "grid", gap: "1.5rem" }}>
        <Link href="/" style={{ color: "var(--kk-brand-mid)", textDecoration: "none" }}>
          ← {brand.name}
        </Link>
        <BrandMark as="h1" size="lg" />
        <h2 style={{ margin: 0 }}>Personel atama</h2>
        <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
          Davet ile üyelik, klima randevusu / sipariş ataması. Çifte aktif atama
          engellenir. Canlı konum sahte ETA üretmez; eski ping canlı değildir.
        </p>
        {!supabaseReady ? (
          <EmptyState title="Supabase bağlı değil">
            Atama RPC’leri gerçek şemaya yazar; demo personel yok.
          </EmptyState>
        ) : (
          <StaffAdminClient />
        )}
      </div>
    </main>
  );
}
