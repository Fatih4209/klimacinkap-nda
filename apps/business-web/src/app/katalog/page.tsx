import { brand } from "@klimacin/config";
import { BrandMark, EmptyState } from "@klimacin/ui";
import Link from "next/link";
import { CatalogManager } from "./CatalogManager";

export default function CatalogPage() {
  const supabaseReady = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  return (
    <main className="kk-page" style={{ padding: "2.5rem 1.25rem 4rem" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", display: "grid", gap: "1.5rem" }}>
        <Link href="/" style={{ color: "var(--kk-brand-mid)", textDecoration: "none" }}>
          ← {brand.name}
        </Link>
        <BrandMark as="h1" size="lg" />
        <h2 style={{ margin: 0 }}>Su / Tüp katalog ve stok</h2>
        <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
          Su: marka, hacim, depozito, boş kap. Tüp: net ürün kartı — kurulum
          talimatı yok. Stok atomik RPC ile güncellenir.
        </p>
        {!supabaseReady ? (
          <EmptyState title="Supabase bağlı değil">
            Katalog <code>upsert_catalog_product</code> ile yazılır; sahte ürün
            eklenmez.
          </EmptyState>
        ) : (
          <CatalogManager />
        )}
        <Link href="/siparisler" style={{ color: "var(--kk-brand-mid)" }}>
          Siparişler →
        </Link>
      </div>
    </main>
  );
}
