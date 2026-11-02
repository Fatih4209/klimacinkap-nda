import { brand } from "@klimacin/config";
import { BrandMark } from "@klimacin/ui";
import Link from "next/link";
import { BootstrapClient } from "./BootstrapClient";

export const dynamic = "force-dynamic";

export default function AdminBootstrapPage() {
  const configuredHint = Boolean(
    process.env.ADMIN_BOOTSTRAP_SECRET &&
      process.env.ADMIN_BOOTSTRAP_SECRET.length >= 16 &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL,
  );

  return (
    <main className="kk-page" style={{ padding: "2.5rem 1.25rem 4rem" }}>
      <div
        style={{
          maxWidth: 640,
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
        <h2 style={{ margin: 0 }}>Güvenli ilk admin bootstrap</h2>
        <BootstrapClient configuredHint={configuredHint} />
      </div>
    </main>
  );
}
