"use client";

import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  assignStaff,
  assignmentStatusLabelsTr,
  getAssignmentTracking,
  inviteStaffMember,
  jobKindLabelsTr,
  type AssignmentTracking,
  type JobAssignment,
} from "@klimacin/shared";
import { Button, EmptyState } from "@klimacin/ui";
import { getBusinessSupabase } from "@/lib/supabase";

export function StaffAdminClient() {
  const [businessId, setBusinessId] = useState("");
  const [staffProfileId, setStaffProfileId] = useState("");
  const [klimaAppointmentId, setKlimaAppointmentId] = useState("");
  const [productOrderId, setProductOrderId] = useState("");
  const [assignments, setAssignments] = useState<JobAssignment[]>([]);
  const [tracking, setTracking] = useState<AssignmentTracking | null>(null);
  const [trackId, setTrackId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadAssignments = useCallback(async () => {
    const client = getBusinessSupabase();
    if (!client) {
      return;
    }
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      return;
    }
    const { data, error: queryError } = await client
      .from("job_assignments")
      .select(
        "id, business_id, staff_profile_id, kind, klima_appointment_id, product_order_id, status, completion_code, assigned_at",
      )
      .order("assigned_at", { ascending: false })
      .limit(50);

    if (queryError) {
      setError(queryError.message);
      return;
    }
    setAssignments(
      (data ?? []).map((row) => ({
        id: row.id as string,
        businessId: row.business_id as string,
        staffProfileId: row.staff_profile_id as string,
        kind: row.kind as JobAssignment["kind"],
        klimaAppointmentId: (row.klima_appointment_id as string | null) ?? null,
        productOrderId: (row.product_order_id as string | null) ?? null,
        status: row.status as JobAssignment["status"],
        completionCode: row.completion_code as string,
        assignedAt: row.assigned_at as string,
      })),
    );
  }, []);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  async function onInvite(event: FormEvent) {
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
    const result = await inviteStaffMember(client, businessId, staffProfileId);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setInfo(
      result.data.isActive
        ? `Personel zaten aktif: ${result.data.id}`
        : `Davet oluşturuldu (pending). Token: ${result.data.inviteToken ?? "—"} — personel uygulamadan kabul etmeli; açık kayıt yok.`,
    );
    setBusy(false);
  }

  async function onAssign(event: FormEvent) {
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
    const result = await assignStaff(client, {
      staffProfileId,
      klimaAppointmentId: klimaAppointmentId || undefined,
      productOrderId: productOrderId || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setInfo(
      `Atandı. Tamamlama kodu: ${result.data.completionCode} (personel uygulamada görür; müşteriye sahte ETA yok).`,
    );
    await loadAssignments();
    setBusy(false);
  }

  async function onTrack(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const client = getBusinessSupabase();
    if (!client) {
      setError("Supabase bağlı değil.");
      setBusy(false);
      return;
    }
    const result = await getAssignmentTracking(client, trackId);
    if (!result.ok) {
      setError(result.error);
      setTracking(null);
      setBusy(false);
      return;
    }
    setTracking(result.data);
    setBusy(false);
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {error ? <EmptyState title="Hata">{error}</EmptyState> : null}
      {info ? <EmptyState title="Durum">{info}</EmptyState> : null}

      <form onSubmit={onInvite} style={{ display: "grid", gap: "0.7rem" }}>
        <h3 style={{ margin: 0 }}>Personel davet / üyelik</h3>
        <input
          required
          placeholder="İşletme ID"
          value={businessId}
          onChange={(e) => setBusinessId(e.target.value)}
          style={inputStyle}
        />
        <input
          required
          placeholder="Personel profil ID"
          value={staffProfileId}
          onChange={(e) => setStaffProfileId(e.target.value)}
          style={inputStyle}
        />
        <Button type="submit" disabled={busy}>
          Davet oluştur
        </Button>
      </form>

      <form onSubmit={onAssign} style={{ display: "grid", gap: "0.7rem" }}>
        <h3 style={{ margin: 0 }}>İş ata (bir hedef)</h3>
        <input
          required
          placeholder="Personel profil ID"
          value={staffProfileId}
          onChange={(e) => setStaffProfileId(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Klima randevu ID (veya boş)"
          value={klimaAppointmentId}
          onChange={(e) => {
            setKlimaAppointmentId(e.target.value);
            if (e.target.value) setProductOrderId("");
          }}
          style={inputStyle}
        />
        <input
          placeholder="Sipariş ID (veya boş)"
          value={productOrderId}
          onChange={(e) => {
            setProductOrderId(e.target.value);
            if (e.target.value) setKlimaAppointmentId("");
          }}
          style={inputStyle}
        />
        <Button type="submit" disabled={busy}>
          Ata
        </Button>
      </form>

      <section style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Atamalar</h3>
        {assignments.length === 0 ? (
          <EmptyState title="Atama yok">Henüz kayıt yok.</EmptyState>
        ) : (
          assignments.map((a) => (
            <article
              key={a.id}
              className="kk-category-tile"
              data-accent="klima"
              style={{ gap: "0.35rem" }}
            >
              <strong>
                {jobKindLabelsTr[a.kind]} · {assignmentStatusLabelsTr[a.status]}
              </strong>
              <span style={{ color: "var(--kk-text-secondary)" }}>
                {a.id} · personel {a.staffProfileId}
              </span>
              <span>Tamamlama kodu: {a.completionCode}</span>
            </article>
          ))
        )}
        <button
          type="button"
          className="kk-btn kk-btn-secondary"
          onClick={() => void loadAssignments()}
        >
          Yenile
        </button>
      </section>

      <form onSubmit={onTrack} style={{ display: "grid", gap: "0.7rem" }}>
        <h3 style={{ margin: 0 }}>Takip oku</h3>
        <input
          required
          placeholder="Atama ID"
          value={trackId}
          onChange={(e) => setTrackId(e.target.value)}
          style={inputStyle}
        />
        <Button type="submit" variant="secondary" disabled={busy}>
          Konumu getir
        </Button>
        {tracking ? (
          <EmptyState
            title={tracking.isLive ? "Canlı konum" : "Canlı değil"}
          >
            {tracking.lat == null
              ? "Henüz konum ping’i yok (simüle edilmez)."
              : `${tracking.lat}, ${tracking.lng} · alınan ${tracking.receivedAt}`}
            {tracking.trackingActive
              ? ""
              : " Takip kapalı (iş bitti veya henüz yolda değil)."}
          </EmptyState>
        ) : null}
      </form>
    </div>
  );
}

const inputStyle: CSSProperties = {
  padding: "0.7rem 0.8rem",
  borderRadius: 10,
  border: "1px solid var(--kk-border)",
  font: "inherit",
};
