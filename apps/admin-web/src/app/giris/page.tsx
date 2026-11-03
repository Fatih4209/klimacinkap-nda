import { brand } from "@klimacin/config";
import { BrandMark } from "@klimacin/ui";
import Link from "next/link";
import { AdminSmsOtpClient } from "./SmsOtpClient";

export default function AdminLoginPage() {
  return (
    <main className="kk-page" style={{ padding: "2.5rem 1.25rem 4rem" }}>
      <div
        style={{
          maxWidth: 560,
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
        <h2 style={{ margin: 0 }}>Yönetici girişi</h2>
        <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
          Açık admin kaydı yok. İlk admin{" "}
          <Link href="/bootstrap">bootstrap</Link> ile atanır; sonra SMS ile
          giriş.
        </p>
        <AdminSmsOtpClient />
      </div>
    </main>
  );
}
