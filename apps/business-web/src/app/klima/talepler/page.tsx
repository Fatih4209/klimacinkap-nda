import { brand } from "@klimacin/config";
import { BrandMark, EmptyState } from "@klimacin/ui";
import Link from "next/link";
import { KlimaRequestsClient } from "./KlimaRequestsClient";

export default function KlimaRequestsPage() {
  const supabaseReady = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  return (
    <main className="kk-page" style={{ padding: "2.5rem 1.25rem 4rem" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", display: "grid", gap: "1.5rem" }}>
        <Link href="/" style={{ color: "var(--kk-brand-mid)", textDecoration: "none" }}>
          ← {brand.name}
        </Link>
        <BrandMark as="h1" size="lg" />
        <h2 style={{ margin: 0 }}>Klima talepleri</h2>
        <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
          Yalnızca açık bölgedeki, onaylı ve aktif klima işletmelerinin
          görebileceği gerçek talepler. Demo liste yok.
        </p>
        {!supabaseReady ? (
          <EmptyState title="Supabase bağlı değil">
            Talepler <code>klima_requests</code> tablosundan okunur. Ortam
            anahtarları olmadan boş durum gösterilir; sahte talep üretilmez.
          </EmptyState>
        ) : (
          <KlimaRequestsClient />
        )}
        <Link href="/klima/randevular" style={{ color: "var(--kk-brand-mid)" }}>
          Randevular →
        </Link>
      </div>
    </main>
  );
}
