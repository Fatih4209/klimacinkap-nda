import { brand, serviceCategories } from "@klimacin/config";
import { BrandMark, EmptyState } from "@klimacin/ui";
import Link from "next/link";

export default function BusinessApplicationPage() {
  return (
    <main className="kk-page" style={{ padding: "2.5rem 1.25rem 4rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "grid", gap: "1.5rem" }}>
        <Link href="/" style={{ color: "var(--kk-brand-mid)", textDecoration: "none" }}>
          ← {brand.name}
        </Link>
        <BrandMark as="h1" size="lg" />
        <h2 style={{ margin: 0 }}>İşletme başvurusu</h2>
        <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
          Başvuru formu şema ve doğrulama ile hazır; kayıt için Auth + Postgres
          bağlantısı gerekir. Platform admin onayı olmadan işletme aktif olmaz.
          Yetkili servis iddiası, doğrulanmış işletme onayı değildir.
        </p>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--kk-text-secondary)" }}>
          {serviceCategories.map((c) => (
            <li key={c.id}>
              <strong>{c.label}</strong> — kategori bazlı onay
            </li>
          ))}
        </ul>
        <EmptyState title="Kayıt henüz açık değil">
          Supabase migration dosyaları uygulandıktan ve SMS Auth
          yapılandırıldıktan sonra bu form canlıya alınır. Sahte başvuru
          oluşturulmaz.
        </EmptyState>
      </div>
    </main>
  );
}
