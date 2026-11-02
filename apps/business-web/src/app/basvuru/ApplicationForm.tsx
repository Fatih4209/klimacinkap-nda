"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { serviceCategories } from "@klimacin/config";
import {
  saveBusinessApplicationDraft,
  submitBusinessApplication,
  type ServiceCategoryId,
} from "@klimacin/shared";
import { Button, EmptyState } from "@klimacin/ui";
import { getBusinessSupabase } from "@/lib/supabase";

const field: CSSProperties = {
  display: "grid",
  gap: "0.35rem",
};

const input: CSSProperties = {
  padding: "0.65rem 0.75rem",
  borderRadius: 8,
  border: "1px solid var(--kk-border-subtle)",
  font: "inherit",
};

export function ApplicationForm() {
  const client = getBusinessSupabase();
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cityCode, setCityCode] = useState("34");
  const [cityName, setCityName] = useState("İstanbul");
  const [districtCode, setDistrictCode] = useState("");
  const [districtName, setDistrictName] = useState("");
  const [categories, setCategories] = useState<ServiceCategoryId[]>([]);
  const [claimsAuthorized, setClaimsAuthorized] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!client) {
    return (
      <EmptyState title="Supabase bağlantısı yok">
        Form kodu hazır; <code>NEXT_PUBLIC_SUPABASE_URL</code> ve anon anahtar
        olmadan kayıt yazılmaz. Sahte başvuru oluşturulmaz.
      </EmptyState>
    );
  }

  function toggleCategory(id: ServiceCategoryId) {
    setCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  async function ensureSession() {
    const { data } = await client!.auth.getSession();
    if (!data.session) {
      setError("Oturum gerekli. SMS Auth bağlandıktan sonra giriş yapın.");
      return false;
    }
    return true;
  }

  async function onSaveDraft(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    if (!(await ensureSession())) {
      setBusy(false);
      return;
    }

    const result = await saveBusinessApplicationDraft(client!, {
      legalName,
      tradeName,
      taxId,
      phone,
      email,
      cityCode,
      cityName,
      districtCode,
      districtName,
      categories,
      claimsAuthorizedService: claimsAuthorized,
      applicationId: applicationId ?? undefined,
    });

    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setApplicationId(result.data.id);
    setInfo(`Taslak kaydedildi (${result.data.status}).`);
    setBusy(false);
  }

  async function onSubmit() {
    setBusy(true);
    setError(null);
    setInfo(null);
    if (!(await ensureSession())) {
      setBusy(false);
      return;
    }
    if (!applicationId) {
      setError("Önce taslak kaydedin.");
      setBusy(false);
      return;
    }
    const result = await submitBusinessApplication(client!, applicationId);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setInfo(
      `Başvuru gönderildi (${result.data.status}). Admin onayı olmadan işletme aktif olmaz.`,
    );
    setBusy(false);
  }

  return (
    <form onSubmit={onSaveDraft} style={{ display: "grid", gap: "0.85rem" }}>
      <label style={field}>
        Unvan
        <input
          style={input}
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          required
        />
      </label>
      <label style={field}>
        Ticari ad
        <input
          style={input}
          value={tradeName}
          onChange={(e) => setTradeName(e.target.value)}
          required
        />
      </label>
      <label style={field}>
        Vergi no
        <input
          style={input}
          value={taxId}
          onChange={(e) => setTaxId(e.target.value)}
          required
        />
      </label>
      <label style={field}>
        Telefon
        <input
          style={input}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </label>
      <label style={field}>
        E-posta
        <input
          style={input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <div
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        }}
      >
        <label style={field}>
          İl kodu
          <input
            style={input}
            value={cityCode}
            onChange={(e) => setCityCode(e.target.value)}
            required
          />
        </label>
        <label style={field}>
          İl
          <input
            style={input}
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            required
          />
        </label>
        <label style={field}>
          İlçe kodu
          <input
            style={input}
            value={districtCode}
            onChange={(e) => setDistrictCode(e.target.value)}
            required
          />
        </label>
        <label style={field}>
          İlçe
          <input
            style={input}
            value={districtName}
            onChange={(e) => setDistrictName(e.target.value)}
            required
          />
        </label>
      </div>

      <fieldset style={{ border: "1px solid var(--kk-border-subtle)", borderRadius: 8, padding: "0.75rem" }}>
        <legend>Kategoriler (eşit; ayrı onay)</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {serviceCategories.map((c) => (
            <label key={c.id} style={{ display: "flex", gap: "0.35rem" }}>
              <input
                type="checkbox"
                checked={categories.includes(c.id)}
                onChange={() => toggleCategory(c.id)}
              />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
        <input
          type="checkbox"
          checked={claimsAuthorized}
          onChange={(e) => setClaimsAuthorized(e.target.checked)}
        />
        <span style={{ color: "var(--kk-text-secondary)" }}>
          Yetkili servis iddiası (doğrulanmış işletme onayı değildir; admin
          onayı ayrıdır).
        </span>
      </label>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        <Button type="submit" disabled={busy}>
          {busy ? "Kaydediliyor…" : "Taslak kaydet"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || !applicationId}
          onClick={onSubmit}
        >
          Başvuruyu gönder
        </Button>
      </div>

      {error ? <EmptyState title="Kayıt yapılamadı">{error}</EmptyState> : null}
      {info ? <EmptyState title="Durum">{info}</EmptyState> : null}
    </form>
  );
}
