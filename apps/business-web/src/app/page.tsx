import { brand, serviceCategories } from "@klimacin/config";
import { businessApplicationStatuses, roleLabelsTr } from "@klimacin/shared";
import { BrandMark, Button, EmptyState } from "@klimacin/ui";
import Link from "next/link";

export default function BusinessHomePage() {
  const supabaseReady = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  return (
    <main className="kk-page">
      <section
        style={{
          padding: "clamp(2.5rem, 6vw, 5rem) 1.25rem 3rem",
          maxWidth: 960,
          margin: "0 auto",
          display: "grid",
          gap: "1.75rem",
        }}
      >
        <header style={{ display: "grid", gap: "1rem", maxWidth: 640 }}>
          <p
            style={{
              margin: 0,
              color: "var(--kk-brand-glow)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontSize: "0.75rem",
              fontWeight: 700,
            }}
          >
            {roleLabelsTr.business_owner}
          </p>
          <BrandMark as="h1" size="hero" />
          <p
            style={{
              margin: 0,
              color: "var(--kk-text-secondary)",
              fontSize: "1.2rem",
              lineHeight: 1.35,
            }}
          >
            {brand.slogan}
          </p>
        </header>

        <div className="kk-category-grid" role="list">
          {serviceCategories.map((category) => (
            <div
              key={category.id}
              className="kk-category-tile"
              data-accent={category.id}
              role="listitem"
            >
              <strong
                style={{
                  fontFamily: "var(--kk-font-display)",
                  fontSize: "1.35rem",
                  letterSpacing: "-0.02em",
                }}
              >
                {category.label}
              </strong>
              <span style={{ color: "var(--kk-text-secondary)" }}>
                {category.description}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "0 1.25rem 4rem",
          display: "grid",
          gap: "1.25rem",
          borderTop: "1px solid var(--kk-border)",
          paddingTop: "2rem",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "0.8rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--kk-text-muted)",
          }}
        >
          Panel
        </h2>
        <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
          Başvuruda seçtiğiniz her kategori ayrı onaylanır. Onay olmadan işletme
          aktif olmaz.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          <Link href="/basvuru">
            <Button>İşletme başvurusu</Button>
          </Link>
          <Link href="/klima/talepler">
            <Button>Klima talepleri</Button>
          </Link>
          <Link href="/klima/randevular">
            <Button variant="secondary">Klima randevuları</Button>
          </Link>
          <Link href="/katalog">
            <Button>Su / Tüp katalog</Button>
          </Link>
          <Link href="/siparisler">
            <Button variant="secondary">Siparişler</Button>
          </Link>
          <Link href="/personel">
            <Button>Personel atama</Button>
          </Link>
          <Link href="/iletisim">
            <Button variant="secondary">Bildirim / Mesaj / Sorun</Button>
          </Link>
          <Link href="/abonelik">
            <Button>Abonelik</Button>
          </Link>
          <Link href="/kpi">
            <Button variant="secondary">KPI</Button>
          </Link>
          <Link href="/hesap">
            <Button variant="secondary">Hesap</Button>
          </Link>
          <Link href="/gizlilik">
            <Button variant="secondary">Gizlilik</Button>
          </Link>
          <Link href="/hesap-silme">
            <Button variant="secondary">Hesap silme</Button>
          </Link>
        </div>

        {!supabaseReady ? (
          <EmptyState title="Supabase bağlantısı yok">
            Başvuru kaydı ve SMS giriş için{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> ve anon anahtar gerekir.
            Durum makinesi hazır: {businessApplicationStatuses.join(", ")}.
          </EmptyState>
        ) : null}
      </section>
    </main>
  );
}
