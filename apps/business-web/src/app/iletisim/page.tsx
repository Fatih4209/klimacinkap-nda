import { brand } from "@klimacin/config";
import { BrandMark, EmptyState } from "@klimacin/ui";
import Link from "next/link";
import { CommsClient } from "./CommsClient";

export default function CommsPage() {
  const supabaseReady = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  return (
    <main className="kk-page" style={{ padding: "2.5rem 1.25rem 4rem" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", display: "grid", gap: "1.5rem" }}>
        <Link href="/" style={{ color: "var(--kk-brand-mid)", textDecoration: "none" }}>
          ← {brand.name}
        </Link>
        <BrandMark as="h1" size="lg" />
        <h2 style={{ margin: 0 }}>Bildirim · Mesaj · Sorun</h2>
        <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
          In-app bildirimler sunucudan gelir. Push anahtarı yoksa gönderim
          başarılı sayılmaz. Sipariş durumu bildirim metninden değil tablodan
          okunur.
        </p>
        {!supabaseReady ? (
          <EmptyState title="Supabase bağlı değil">
            İletişim akışları gerçek şemaya bağlıdır; demo mesaj yok.
          </EmptyState>
        ) : (
          <CommsClient />
        )}
      </div>
    </main>
  );
}
