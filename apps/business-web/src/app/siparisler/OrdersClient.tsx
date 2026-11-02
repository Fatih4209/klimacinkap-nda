"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import {
  acceptProductOrder,
  cancelProductOrder,
  catalogCategoryLabelsTr,
  deliverProductOrder,
  doorPaymentLabelsTr,
  formatTryFromKurus,
  type CatalogCategory,
  type DoorPaymentMethod,
  type ProductOrderStatus,
} from "@klimacin/shared";
import { Button, EmptyState } from "@klimacin/ui";
import { getBusinessSupabase } from "@/lib/supabase";

type OrderRow = {
  id: string;
  category: CatalogCategory;
  status: ProductOrderStatus;
  subtotal_kurus: number;
  deposit_kurus_total: number;
  empty_containers_expected: number;
  payment_method: DoorPaymentMethod;
  city_name: string;
  district_name: string;
  created_at: string;
};

export function OrdersClient() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [emptyReturns, setEmptyReturns] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const client = getBusinessSupabase();
    if (!client) {
      setError("Supabase istemcisi yok.");
      setLoading(false);
      return;
    }
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      setError("Oturum gerekli.");
      setRows([]);
      setLoading(false);
      return;
    }

    const { data, error: queryError } = await client
      .from("product_orders")
      .select(
        "id, category, status, subtotal_kurus, deposit_kurus_total, empty_containers_expected, payment_method, city_name, district_name, created_at",
      )
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setRows([]);
    } else {
      setRows((data as OrderRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function accept(orderId: string) {
    setError(null);
    setInfo(null);
    const client = getBusinessSupabase();
    if (!client) {
      setError("Supabase bağlı değil.");
      return;
    }
    const result = await acceptProductOrder(client, orderId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setInfo("Sipariş kabul edildi.");
    await load();
  }

  async function cancel(orderId: string) {
    setError(null);
    setInfo(null);
    const client = getBusinessSupabase();
    if (!client) {
      setError("Supabase bağlı değil.");
      return;
    }
    const result = await cancelProductOrder(client, orderId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setInfo("Sipariş iptal; stok rezervasyonu geri alındı.");
    await load();
  }

  async function deliver(orderId: string) {
    setError(null);
    setInfo(null);
    const client = getBusinessSupabase();
    if (!client) {
      setError("Supabase bağlı değil.");
      return;
    }
    const returned = Number(emptyReturns[orderId] ?? "0");
    const result = await deliverProductOrder(client, orderId, returned);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setInfo("Teslim kaydı yazıldı; stok düşüldü ve depozito iadesi hesaplandı.");
    await load();
  }

  if (loading) {
    return <p style={{ color: "var(--kk-text-secondary)" }}>Yükleniyor…</p>;
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {error ? <EmptyState title="Hata">{error}</EmptyState> : null}
      {info ? <EmptyState title="Durum">{info}</EmptyState> : null}
      {rows.length === 0 ? (
        <EmptyState title="Sipariş yok">
          Müşteri sipariş verince burada listelenir.
        </EmptyState>
      ) : (
        rows.map((row) => (
          <article
            key={row.id}
            className="kk-category-tile"
            data-accent={row.category}
            style={{ gap: "0.5rem" }}
          >
            <strong>
              {catalogCategoryLabelsTr[row.category]} · {row.status}
            </strong>
            <span style={{ color: "var(--kk-text-secondary)" }}>
              {row.district_name}, {row.city_name} ·{" "}
              {doorPaymentLabelsTr[row.payment_method]}
            </span>
            <span>
              Ürün {formatTryFromKurus(row.subtotal_kurus)} · Depozito{" "}
              {formatTryFromKurus(row.deposit_kurus_total)} · Beklenen boş kap{" "}
              {row.empty_containers_expected}
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {row.status === "pending" ? (
                <>
                  <Button type="button" onClick={() => void accept(row.id)}>
                    Kabul et
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void cancel(row.id)}
                  >
                    İptal
                  </Button>
                </>
              ) : null}
              {row.status === "accepted" || row.status === "out_for_delivery" ? (
                <>
                  <input
                    placeholder="İade boş kap"
                    value={emptyReturns[row.id] ?? "0"}
                    onChange={(e) =>
                      setEmptyReturns((prev) => ({
                        ...prev,
                        [row.id]: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                  <Button type="button" onClick={() => void deliver(row.id)}>
                    Teslim et
                  </Button>
                </>
              ) : null}
            </div>
          </article>
        ))
      )}
      <button
        type="button"
        className="kk-btn kk-btn-secondary"
        onClick={() => void load()}
      >
        Yenile
      </button>
    </div>
  );
}

const inputStyle: CSSProperties = {
  padding: "0.55rem 0.7rem",
  borderRadius: 10,
  border: "1px solid var(--kk-border)",
  font: "inherit",
  maxWidth: 140,
};
