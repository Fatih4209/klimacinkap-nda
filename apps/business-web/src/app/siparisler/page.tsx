import { brand } from "@klimacin/config";
import { BrandMark, EmptyState } from "@klimacin/ui";
import Link from "next/link";
import { OrdersClient } from "./OrdersClient";

export default function OrdersPage() {
  const supabaseReady = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  return (
    <main className="kk-page" style={{ padding: "2.5rem 1.25rem 4rem" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", display: "grid", gap: "1.5rem" }}>
        <Link href="/" style={{ color: "var(--kk-brand-mid)", textDecoration: "none" }}>
          ← {brand.name}
        </Link>
        <BrandMark as="h1" size="lg" />
        <h2 style={{ margin: 0 }}>Su / Tüp siparişleri</h2>
        <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
          Kabul, teslimat ve boş kap iadesi. Ödeme kapıda nakit/POS — platform
          tahsilatı yok.
        </p>
        {!supabaseReady ? (
          <EmptyState title="Supabase bağlı değil">
            Siparişler gerçek tablodan okunur; örnek sipariş yok.
          </EmptyState>
        ) : (
          <OrdersClient />
        )}
      </div>
    </main>
  );
}
