import { brand } from "@klimacin/config";
import { HYPOTHESIS_BUSINESS_MONTHLY_PRICE_KURUS } from "@klimacin/shared";
import { BrandMark, EmptyState } from "@klimacin/ui";
import Link from "next/link";
import { SubscriptionClient } from "./SubscriptionClient";

export default function SubscriptionPage() {
  const supabaseReady = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  return (
    <main className="kk-page" style={{ padding: "2.5rem 1.25rem 4rem" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", display: "grid", gap: "1.5rem" }}>
        <Link href="/" style={{ color: "var(--kk-brand-mid)", textDecoration: "none" }}>
          ← {brand.name}
        </Link>
        <BrandMark as="h1" size="lg" />
        <h2 style={{ margin: 0 }}>İşletme aboneliği</h2>
        <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
          Hipotez aylık ücret yapılandırılabilir (varsayılan{" "}
          {(HYPOTHESIS_BUSINESS_MONTHLY_PRICE_KURUS / 100).toFixed(2)} TRY). Kart
          verisi kendi veritabanımızda tutulmaz. Ödeme anahtarı yoksa tahsilat
          başarılı sayılmaz. Ticari işlemler sunucu abonelik kontrolüne bağlıdır.
        </p>
        {!supabaseReady ? (
          <EmptyState title="Supabase bağlı değil">
            Abonelik planları ve checkout gerçek şemaya yazar; sahte ödeme yok.
          </EmptyState>
        ) : (
          <SubscriptionClient />
        )}
      </div>
    </main>
  );
}
