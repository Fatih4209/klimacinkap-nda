import { brand } from "@klimacin/config";
import {
  ACCOUNT_DELETION_STEPS_TR,
  accountDeletionStatuses,
} from "@klimacin/shared";
import { BrandMark, EmptyState } from "@klimacin/ui";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Hesap silme kuyruğu — ${brand.name}`,
  description: "Platform admin hesap silme incelemesi.",
};

export default function AdminAccountDeletionPage() {
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
          ← Yönetim
        </Link>
        <BrandMark as="h1" size="lg" />
        <h2 style={{ margin: 0 }}>Hesap silme kuyruğu</h2>
        <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
          RPC: <code>admin_update_account_deletion_request</code>. Durumlar:{" "}
          {accountDeletionStatuses.join(", ")}. Auth kullanıcısını burada otomatik
          silmeyiz — ops kontrol listesine bakın.
        </p>
        <ol
          style={{
            margin: 0,
            paddingLeft: "1.25rem",
            display: "grid",
            gap: "0.5rem",
          }}
        >
          {ACCOUNT_DELETION_STEPS_TR.map((step) => (
            <li key={step} style={{ color: "var(--kk-text-secondary)" }}>
              {step}
            </li>
          ))}
        </ol>
        <EmptyState title="Supabase bağlanınca liste açılır">
          Migration <code>20260322000700_account_deletion_requests.sql</code>{" "}
          uygulanmalı. Canlı silme E2E cihaz/ortam olmadan “geçti” sayılmaz.
        </EmptyState>
        <p style={{ margin: 0 }}>
          Genel gizlilik metni işletme panelinde:{" "}
          <code>/gizlilik</code> (aynı içerik paketi <code>@klimacin/shared</code>
          ).
        </p>
      </div>
    </main>
  );
}
