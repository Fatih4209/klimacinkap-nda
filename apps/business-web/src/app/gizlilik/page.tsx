import { brand } from "@klimacin/config";
import {
  DATA_CATEGORIES,
  PRIVACY_CONTACT_PLACEHOLDER,
} from "@klimacin/shared";
import { BrandMark } from "@klimacin/ui";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Gizlilik — ${brand.name}`,
  description: `${brand.name} kişisel veri kategorileri ve saklama özeti.`,
};

export default function PrivacyPage() {
  return (
    <main className="kk-page" style={{ padding: "2.5rem 1.25rem 4rem" }}>
      <div
        style={{
          maxWidth: 720,
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
        <h2 style={{ margin: 0 }}>Gizlilik özeti</h2>
        <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
          Bu metin mevcut şema ve ürün akışlarına dayanır. Avukat onayı ve KVKK
          aydınlatma metni yayın öncesi ayrıca hazırlanmalıdır. Hedef alan adı{" "}
          <code>{brand.domainTarget}</code> — DNS bu repoda değiştirilmez.
        </p>

        <section style={{ display: "grid", gap: "1rem" }}>
          <h3 style={{ margin: 0 }}>İşlenen veri kategorileri</h3>
          {DATA_CATEGORIES.map((cat) => (
            <article
              key={cat.id}
              style={{
                display: "grid",
                gap: "0.35rem",
                paddingBottom: "0.75rem",
                borderBottom: "1px solid var(--kk-border-subtle)",
              }}
            >
              <strong>{cat.titleTr}</strong>
              <span style={{ color: "var(--kk-text-secondary)" }}>
                {cat.fieldsTr}
              </span>
              <span
                style={{
                  color: "var(--kk-text-muted)",
                  fontSize: "0.85rem",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                {cat.tables.join(", ")}
              </span>
            </article>
          ))}
        </section>

        <section style={{ display: "grid", gap: "0.5rem" }}>
          <h3 style={{ margin: 0 }}>Konum</h3>
          <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
            Müşteri uygulaması konum iznini adres seçimi için ister; arka plan
            konumu toplanmaz. Personel uygulaması yalnızca atanmış iş{" "}
            <code>en_route</code> / <code>on_site</code> iken konum ping’i
            gönderir; iş bitince paylaşım kesilir. Eski ping “canlı” sayılmaz.
          </p>
        </section>

        <section style={{ display: "grid", gap: "0.5rem" }}>
          <h3 style={{ margin: 0 }}>Ödeme</h3>
          <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
            İşletme aboneliği dış ödeme sağlayıcısı üzerinden ilerler. Kart
            numarası / CVC kendi veritabanımızda saklanmaz. Müşteri hizmet bedeli
            kapıda nakit/POS’tur; platform müşteri bedelini tahsil etmiş gibi
            göstermez.
          </p>
        </section>

        <section style={{ display: "grid", gap: "0.5rem" }}>
          <h3 style={{ margin: 0 }}>Hesap silme</h3>
          <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
            Mağaza gereksinimi için hesap silme talebi akışı vardır. Ayrıntı:{" "}
            <Link href="/hesap-silme">/hesap-silme</Link>.
          </p>
        </section>

        <p style={{ margin: 0, color: "var(--kk-text-muted)", fontSize: "0.9rem" }}>
          İletişim: {PRIVACY_CONTACT_PLACEHOLDER}
        </p>
      </div>
    </main>
  );
}
