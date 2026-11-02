import { brand, serviceCategories } from "@klimacin/config";
import { BrandMark } from "@klimacin/ui";
import Link from "next/link";
import { ApplicationForm } from "./ApplicationForm";

export default function BusinessApplicationPage() {
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
        <h2 style={{ margin: 0 }}>İşletme başvurusu</h2>
        <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
          Auth + Supabase yoksa form dürüst boş durum gösterir; sahte başvuru
          yazılmaz. Platform admin onayı ve kategori onayı olmadan işletme aktif
          olmaz. Kategoriler:{" "}
          {serviceCategories.map((c) => c.label).join(", ")}.
        </p>
        <ApplicationForm />
      </div>
    </main>
  );
}
