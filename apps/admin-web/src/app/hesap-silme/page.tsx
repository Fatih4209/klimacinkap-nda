import { ACCOUNT_DELETION_STEPS_TR } from "@klimacin/shared";
import { BrandMark } from "@klimacin/ui";
import Link from "next/link";
import { AccountDeletionQueueClient } from "./AccountDeletionQueueClient";

export default function AdminAccountDeletionPage() {
  return (
    <main className="kk-page" style={{ padding: "2.5rem 1.25rem 4rem" }}>
      <div
        style={{
          maxWidth: 800,
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
        <ol
          style={{
            margin: 0,
            paddingLeft: "1.25rem",
            color: "var(--kk-text-secondary)",
          }}
        >
          {ACCOUNT_DELETION_STEPS_TR.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <AccountDeletionQueueClient />
      </div>
    </main>
  );
}
