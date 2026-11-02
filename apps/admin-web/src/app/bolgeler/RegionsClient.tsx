"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { serviceCategories } from "@klimacin/config";
import {
  adminUpsertServiceRegion,
  listServiceRegions,
  type ServiceCategoryId,
  type ServiceRegionRow,
} from "@klimacin/shared";
import { Button, EmptyState } from "@klimacin/ui";
import { getAdminSupabase } from "@/lib/supabase";

export function RegionsClient() {
  const client = getAdminSupabase();
  const [rows, setRows] = useState<ServiceRegionRow[]>([]);
  const [cityCode, setCityCode] = useState("34");
  const [cityName, setCityName] = useState("İstanbul");
  const [districtCode, setDistrictCode] = useState("");
  const [districtName, setDistrictName] = useState("");
  const [category, setCategory] = useState<ServiceCategoryId>("klima");
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!client) return;
    const result = await listServiceRegions(client);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRows(result.data);
  }, [client]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!client) {
    return (
      <EmptyState title="Supabase bağlantısı yok">
        Bölge aç/kapa RPC hazır; env yokken sahte bölge yazılmaz.
      </EmptyState>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const { data: sessionData } = await client!.auth.getSession();
    if (!sessionData.session) {
      setError("Oturum gerekli (platform admin).");
      setBusy(false);
      return;
    }
    const result = await adminUpsertServiceRegion(client!, {
      cityCode,
      cityName,
      districtCode,
      districtName,
      category,
      isOpen,
    });
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setInfo(
      `${result.data.cityName}/${result.data.districtName} · ${result.data.category} → ${result.data.isOpen ? "açık" : "kapalı"}`,
    );
    setBusy(false);
    await reload();
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <div
          style={{
            display: "grid",
            gap: "0.75rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          }}
        >
          <label>
            İl kodu
            <input
              value={cityCode}
              onChange={(e) => setCityCode(e.target.value)}
              required
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>
          <label>
            İl
            <input
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              required
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>
          <label>
            İlçe kodu
            <input
              value={districtCode}
              onChange={(e) => setDistrictCode(e.target.value)}
              required
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>
          <label>
            İlçe
            <input
              value={districtName}
              onChange={(e) => setDistrictName(e.target.value)}
              required
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>
        </div>
        <label>
          Kategori
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ServiceCategoryId)}
            style={{ display: "block", marginTop: 4 }}
          >
            {serviceCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={isOpen}
            onChange={(e) => setIsOpen(e.target.checked)}
          />
          Hizmete açık
        </label>
        <Button type="submit" disabled={busy}>
          {busy ? "Kaydediliyor…" : "Bölge kaydet"}
        </Button>
      </form>

      {error ? <EmptyState title="Bölge işlemi">{error}</EmptyState> : null}
      {info ? <EmptyState title="Kaydedildi">{info}</EmptyState> : null}

      {rows.length === 0 ? (
        <EmptyState title="Kayıtlı bölge yok">
          Hizmet dışı bölgede kesin randevu oluşturulmaz (klima RPC).
        </EmptyState>
      ) : (
        <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.35rem" }}>
          {rows.map((r) => (
            <li key={r.id}>
              {r.cityName}/{r.districtName} · {r.category} ·{" "}
              {r.isOpen ? "açık" : "kapalı"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
