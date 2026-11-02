"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import {
  adjustProductStock,
  catalogCategoryLabelsTr,
  tryToKurus,
  upsertCatalogProduct,
  type CatalogCategory,
} from "@klimacin/shared";
import { Button, EmptyState } from "@klimacin/ui";
import { getBusinessSupabase } from "@/lib/supabase";

export function CatalogManager() {
  const [businessId, setBusinessId] = useState("");
  const [category, setCategory] = useState<CatalogCategory>("su");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [volumeLiters, setVolumeLiters] = useState("19");
  const [sizeLabel, setSizeLabel] = useState("12 kg");
  const [priceTry, setPriceTry] = useState("");
  const [depositTry, setDepositTry] = useState("0");
  const [requiresEmpty, setRequiresEmpty] = useState(true);
  const [description, setDescription] = useState("");
  const [initialStock, setInitialStock] = useState("0");
  const [stockProductId, setStockProductId] = useState("");
  const [stockOnHand, setStockOnHand] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);

    const client = getBusinessSupabase();
    if (!client) {
      setError("Supabase bağlı değil.");
      setBusy(false);
      return;
    }
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      setError("Oturum gerekli. Auth bypass yok.");
      setBusy(false);
      return;
    }

    let unitPriceKurus: number;
    let depositKurus: number;
    try {
      unitPriceKurus = tryToKurus(Number(priceTry));
      depositKurus = tryToKurus(Number(depositTry));
    } catch {
      setError("Geçerli tutar girin.");
      setBusy(false);
      return;
    }

    const result = await upsertCatalogProduct(client, {
      businessId,
      category,
      name,
      brand: category === "su" ? brand : undefined,
      volumeLiters: category === "su" ? Number(volumeLiters) : undefined,
      sizeLabel: category === "tup" ? sizeLabel : undefined,
      unitPriceKurus,
      depositKurus: category === "su" ? depositKurus : 0,
      requiresEmptyReturn: category === "su" ? requiresEmpty : false,
      description: description || undefined,
      initialStock: Number(initialStock) || 0,
    });

    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setInfo(`Ürün kaydedildi: ${result.data.id}`);
    setBusy(false);
  }

  async function onAdjustStock(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const client = getBusinessSupabase();
    if (!client) {
      setError("Supabase bağlı değil.");
      setBusy(false);
      return;
    }
    const result = await adjustProductStock(
      client,
      stockProductId,
      Number(stockOnHand),
    );
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setInfo("Stok güncellendi.");
    setBusy(false);
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {error ? <EmptyState title="Kaydedilmedi">{error}</EmptyState> : null}
      {info ? <EmptyState title="Durum">{info}</EmptyState> : null}

      <form onSubmit={onCreate} style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Ürün ekle / güncelle</h3>
        <label style={labelStyle}>
          İşletme ID
          <input
            required
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Kategori
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CatalogCategory)}
            style={inputStyle}
          >
            <option value="su">{catalogCategoryLabelsTr.su}</option>
            <option value="tup">{catalogCategoryLabelsTr.tup}</option>
          </select>
        </label>
        <label style={labelStyle}>
          Ürün adı
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
        </label>
        {category === "su" ? (
          <>
            <label style={labelStyle}>
              Marka
              <input
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              Hacim (litre)
              <input
                required
                value={volumeLiters}
                onChange={(e) => setVolumeLiters(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              Depozito (TRY)
              <input
                value={depositTry}
                onChange={(e) => setDepositTry(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={requiresEmpty}
                onChange={(e) => setRequiresEmpty(e.target.checked)}
              />
              Boş kap iadesi gerekli
            </label>
          </>
        ) : (
          <label style={labelStyle}>
            Boyut etiketi (ör. 12 kg)
            <input
              required
              value={sizeLabel}
              onChange={(e) => setSizeLabel(e.target.value)}
              style={inputStyle}
            />
          </label>
        )}
        <label style={labelStyle}>
          Birim fiyat (TRY)
          <input
            required
            value={priceTry}
            onChange={(e) => setPriceTry(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Açıklama {category === "tup" ? "(kurulum talimatı yok)" : ""}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Başlangıç stok
          <input
            value={initialStock}
            onChange={(e) => setInitialStock(e.target.value)}
            style={inputStyle}
          />
        </label>
        <Button type="submit" disabled={busy}>
          {busy ? "Kaydediliyor…" : "Ürünü kaydet"}
        </Button>
      </form>

      <form onSubmit={onAdjustStock} style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Stok ayarla</h3>
        <label style={labelStyle}>
          Ürün ID
          <input
            required
            value={stockProductId}
            onChange={(e) => setStockProductId(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Eldeki miktar
          <input
            required
            value={stockOnHand}
            onChange={(e) => setStockOnHand(e.target.value)}
            style={inputStyle}
          />
        </label>
        <Button type="submit" variant="secondary" disabled={busy}>
          Stoku güncelle
        </Button>
      </form>
    </div>
  );
}

const labelStyle: CSSProperties = { display: "grid", gap: "0.35rem" };
const inputStyle: CSSProperties = {
  padding: "0.7rem 0.8rem",
  borderRadius: 10,
  border: "1px solid var(--kk-border)",
  font: "inherit",
};
