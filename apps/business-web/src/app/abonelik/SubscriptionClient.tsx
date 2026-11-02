"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import {
  cancelBusinessSubscription,
  checkBusinessEntitled,
  formatTryFromKurus,
  getBusinessSubscription,
  listSubscriptionPlans,
  subscriptionStatusLabelsTr,
  type BusinessSubscription,
  type SubscriptionPlan,
} from "@klimacin/shared";
import { Button, EmptyState } from "@klimacin/ui";
import { getBusinessSupabase } from "@/lib/supabase";

export function SubscriptionClient() {
  const [businessId, setBusinessId] = useState("");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<BusinessSubscription | null>(
    null,
  );
  const [entitled, setEntitled] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    const client = getBusinessSupabase();
    if (!client) {
      setError("Supabase istemcisi yok.");
      return;
    }
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      setError("Oturum gerekli.");
      return;
    }

    const listed = await listSubscriptionPlans(client);
    if (!listed.ok) {
      setError(listed.error);
      return;
    }
    setPlans(listed.data);

    if (businessId) {
      const sub = await getBusinessSubscription(client, businessId);
      if (!sub.ok) {
        setError(sub.error);
        return;
      }
      setSubscription(sub.data);
      const ent = await checkBusinessEntitled(client, businessId);
      if (ent.ok) {
        setEntitled(ent.data);
      }
    }
  }, [businessId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function startCheckout(planId: string) {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (!businessId) {
        setError("İşletme ID gerekli.");
        return;
      }
      const client = getBusinessSupabase();
      const accessToken = client
        ? (await client.auth.getSession()).data.session?.access_token
        : undefined;
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {}),
        },
        body: JSON.stringify({ businessId, planId }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        error?: string;
        status?: string;
        checkoutUrl?: string | null;
        amountKurus?: number;
        dependency?: string;
      };

      if (!response.ok || json.ok === false) {
        setError(json.error ?? "Checkout başlatılamadı.");
        return;
      }

      if (json.status === "blocked_no_provider") {
        setInfo(
          `Ödeme sağlayıcı yapılandırılmadı (${json.dependency ?? "STRIPE_SECRET_KEY"}). Tutar ${formatTryFromKurus(json.amountKurus ?? 0)} — tahsilat başarılı sayılmadı.`,
        );
        return;
      }

      if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl;
        return;
      }

      setInfo(`Checkout durumu: ${json.status}`);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onCancel() {
    if (!subscription) {
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const client = getBusinessSupabase();
      if (!client) {
        setError("Supabase bağlı değil.");
        return;
      }
      const result = await cancelBusinessSubscription(
        client,
        subscription.id,
        true,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInfo(
        result.data.cancelAtPeriodEnd
          ? "Dönem sonunda iptal planlandı."
          : "Abonelik iptal edildi.",
      );
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {error ? <EmptyState title="Hata">{error}</EmptyState> : null}
      {info ? <EmptyState title="Durum">{info}</EmptyState> : null}

      <label style={{ display: "grid", gap: "0.35rem" }}>
        İşletme ID
        <input
          value={businessId}
          onChange={(e) => setBusinessId(e.target.value)}
          placeholder="uuid"
          style={inputStyle}
        />
      </label>
      <Button type="button" variant="secondary" onClick={() => void refresh()}>
        Yenile
      </Button>

      <section style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Planlar</h3>
        {plans.length === 0 ? (
          <EmptyState title="Plan yok">Aktif plan bulunamadı.</EmptyState>
        ) : (
          plans.map((plan) => (
            <article
              key={plan.id}
              className="kk-category-tile"
              data-accent="su"
              style={{ gap: "0.45rem" }}
            >
              <strong>
                {plan.name} · {formatTryFromKurus(plan.priceKurus)} /{" "}
                {plan.intervalMonths} ay
              </strong>
              <span style={{ color: "var(--kk-text-secondary)" }}>
                {plan.description ?? plan.code}
              </span>
              <Button
                type="button"
                disabled={busy || !businessId}
                onClick={() => void startCheckout(plan.id)}
              >
                Abone ol / yenile
              </Button>
            </article>
          ))
        )}
      </section>

      <section style={{ display: "grid", gap: "0.5rem" }}>
        <h3 style={{ margin: 0 }}>Mevcut abonelik</h3>
        {subscription ? (
          <>
            <p style={{ margin: 0 }}>
              {subscriptionStatusLabelsTr[subscription.status]}
              {subscription.cancelAtPeriodEnd ? " (dönem sonunda iptal)" : ""}
            </p>
            <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
              Dönem: {subscription.currentPeriodStart ?? "—"} →{" "}
              {subscription.currentPeriodEnd ?? "—"}
            </p>
            <p style={{ margin: 0, color: "var(--kk-text-secondary)" }}>
              Yetki (sunucu):{" "}
              {entitled == null ? "—" : entitled ? "var" : "yok"}
            </p>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void onCancel()}
            >
              Dönem sonunda iptal et
            </Button>
          </>
        ) : (
          <EmptyState title="Abonelik yok">
            Kart bilgisi istemiyoruz / saklamıyoruz. Checkout sağlayıcıda açılır.
          </EmptyState>
        )}
      </section>
    </div>
  );
}

const inputStyle: CSSProperties = {
  padding: "0.7rem 0.8rem",
  borderRadius: 10,
  border: "1px solid var(--kk-border)",
  font: "inherit",
};
