import { brand } from "@klimacin/config";
import {
  ACCOUNT_DELETION_STEPS_TR,
  accountDeletionStatusLabelsTr,
  PRIVACY_CONTACT_PLACEHOLDER,
} from "@klimacin/shared";
import { BrandMark, EmptyState } from "@klimacin/ui";
import Link from "next/link";
import type { Metadata } from "next";
import { AccountDeletionClient } from "./AccountDeletionClient";

export const metadata: Metadata = {
  title: `Hesap silme — ${brand.name}`,
  description: "Hesap silme talebi ve süreç açıklaması.",
};

export default function AccountDeletionPage() {
  const supabaseReady = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

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
        <h2 style={{ margin: 0 }}>Hesap silme</h2>
        <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
          Silme anında “başarılı” uydurulmaz. Önce talep oluşur; tamamlanma
          platform admin / ops adımıdır. Açık sipariş veya aktif işletme
          sahipliği varsa inceleme gerekir.
        </p>

        <ol style={{ margin: 0, paddingLeft: "1.25rem", display: "grid", gap: "0.5rem" }}>
          {ACCOUNT_DELETION_STEPS_TR.map((step) => (
            <li key={step} style={{ color: "var(--kk-text-secondary)" }}>
              {step}
            </li>
          ))}
        </ol>

        <p style={{ margin: 0, color: "var(--kk-text-muted)", fontSize: "0.9rem" }}>
          Durum etiketleri:{" "}
          {Object.values(accountDeletionStatusLabelsTr).join(" · ")}
        </p>

        {supabaseReady ? (
          <AccountDeletionClient />
        ) : (
          <EmptyState title="Supabase bağlantısı yok">
            <code>request_account_deletion</code> RPC’si hazır; çağrı için{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> ve oturum gerekir. Sahte
            “silindi” ekranı yok.
          </EmptyState>
        )}

        <p style={{ margin: 0, color: "var(--kk-text-muted)", fontSize: "0.9rem" }}>
          Gizlilik özeti: <Link href="/gizlilik">/gizlilik</Link> · İletişim:{" "}
          {PRIVACY_CONTACT_PLACEHOLDER}
        </p>
      </div>
    </main>
  );
}
