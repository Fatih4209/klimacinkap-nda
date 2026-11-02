import { brand } from "@klimacin/config";
import { BrandMark } from "@klimacin/ui";
import Link from "next/link";
import { OfferForm } from "./OfferForm";

export default async function KlimaOfferPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;

  return (
    <main className="kk-page" style={{ padding: "2.5rem 1.25rem 4rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "grid", gap: "1.5rem" }}>
        <Link
          href="/klima/talepler"
          style={{ color: "var(--kk-brand-mid)", textDecoration: "none" }}
        >
          ← Talepler
        </Link>
        <BrandMark as="h1" size="lg" />
        <h2 style={{ margin: 0 }}>Klima teklifi</h2>
        <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
          {brand.name} — teşhis ücreti zorunlu alandır (0 olabilir). Teklif
          <code> submit_klima_offer </code> RPC ile kaydedilir; başarı uydurulmaz.
        </p>
        <OfferForm requestId={requestId} />
      </div>
    </main>
  );
}
