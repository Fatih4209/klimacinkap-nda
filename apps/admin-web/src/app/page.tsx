import { brand, serviceCategories } from "@klimacin/config";
import { roleLabelsTr } from "@klimacin/shared";
import { BrandMark, EmptyState } from "@klimacin/ui";
import Link from "next/link";

export default function AdminHomePage() {
  return (
    <main className="kk-page" style={{ padding: "2.5rem 1.25rem 4rem" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", display: "grid", gap: "1.75rem" }}>
        <header style={{ display: "grid", gap: "0.75rem" }}>
          <p style={{ margin: 0, color: "var(--kk-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "0.8rem" }}>
            {roleLabelsTr.platform_admin}
          </p>
          <BrandMark as="h1" size="hero" />
          <p style={{ margin: 0, maxWidth: "36rem", color: "var(--kk-text-secondary)", fontSize: "1.15rem" }}>
            Bölge/kategori aç-kapa, işletme başvuruları ve güvenli bootstrap.
            Açık admin kaydı yoktur.
          </p>
        </header>

        <section className="kk-category-grid">
          {serviceCategories.map((category) => (
            <div
              key={category.id}
              className="kk-category-tile"
              data-accent={category.id}
            >
              <strong>{category.label}</strong>
              <span style={{ color: "var(--kk-text-secondary)" }}>
                Kategori onayı ve bölge kontrolü
              </span>
            </div>
          ))}
        </section>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/basvurular" style={{ textDecoration: "none" }}>
            <span className="kk-btn">Başvurular</span>
          </Link>
          <Link href="/bolgeler" style={{ textDecoration: "none" }}>
            <span className="kk-btn kk-btn-secondary">Bölgeler</span>
          </Link>
          <Link href="/gizlilik" style={{ textDecoration: "none" }}>
            <span className="kk-btn kk-btn-secondary">Gizlilik</span>
          </Link>
          <Link href="/hesap-silme" style={{ textDecoration: "none" }}>
            <span className="kk-btn kk-btn-secondary">Hesap silme kuyruğu</span>
          </Link>
          <Link href="/bootstrap" style={{ textDecoration: "none" }}>
            <span className="kk-btn">İlk admin bootstrap</span>
          </Link>
        </div>

        <EmptyState title={`${brand.name} yönetim`}>
          Açık admin kaydı yoktur. İlk admin{" "}
          <Link href="/bootstrap">güvenli bootstrap</Link> (secret + service
          role) ile atanır. Service role sohbete/istemciye konmaz.
        </EmptyState>
      </div>
    </main>
  );
}
