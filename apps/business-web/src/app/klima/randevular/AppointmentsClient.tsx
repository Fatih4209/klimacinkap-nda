"use client";

import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  completeKlimaAppointment,
  formatTryFromKurus,
  tryToKurus,
} from "@klimacin/shared";
import { Button, EmptyState } from "@klimacin/ui";
import { getBusinessSupabase } from "@/lib/supabase";

type AppointmentRow = {
  id: string;
  status: string;
  scheduled_start: string;
  scheduled_end: string;
  hold_expires_at: string | null;
  request_id: string;
};

export function AppointmentsClient() {
  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [extraDesc, setExtraDesc] = useState<Record<string, string>>({});
  const [extraPrice, setExtraPrice] = useState<Record<string, string>>({});

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
      .from("klima_appointments")
      .select(
        "id, status, scheduled_start, scheduled_end, hold_expires_at, request_id",
      )
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setRows([]);
    } else {
      setRows((data as AppointmentRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function proposeExtra(appointmentId: string, event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    const client = getBusinessSupabase();
    if (!client) {
      setError("Supabase bağlı değil.");
      return;
    }
    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      setError("Oturum gerekli.");
      return;
    }

    let priceKurus: number;
    try {
      priceKurus = tryToKurus(Number(extraPrice[appointmentId] ?? "0"));
    } catch {
      setError("Geçersiz ek iş tutarı.");
      return;
    }

    const description = (extraDesc[appointmentId] ?? "").trim();
    if (description.length < 4) {
      setError("Ek iş açıklaması çok kısa.");
      return;
    }

    const { error: insertError } = await client
      .from("klima_extra_work_items")
      .insert({
        appointment_id: appointmentId,
        description,
        price_kurus: priceKurus,
        proposed_by: userId,
        status: "proposed",
      });

    if (insertError) {
      setError(insertError.message);
      return;
    }
    setInfo("Ek iş önerildi — müşteri onayı bekleniyor.");
    setExtraDesc((prev) => ({ ...prev, [appointmentId]: "" }));
    setExtraPrice((prev) => ({ ...prev, [appointmentId]: "" }));
  }

  async function complete(appointmentId: string) {
    setError(null);
    setInfo(null);
    const client = getBusinessSupabase();
    if (!client) {
      setError("Supabase bağlı değil.");
      return;
    }
    const result = await completeKlimaAppointment(client, appointmentId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setInfo("Randevu tamamlandı.");
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
        <EmptyState title="Randevu yok">
          Müşteri teklif kabul edince hold/confirmed kayıtları burada görünür.
        </EmptyState>
      ) : (
        rows.map((row) => (
          <article
            key={row.id}
            className="kk-category-tile"
            data-accent="klima"
            style={{ gap: "0.55rem" }}
          >
            <strong>
              {row.status} · {row.scheduled_start} → {row.scheduled_end}
            </strong>
            {row.hold_expires_at ? (
              <span style={{ color: "var(--kk-text-secondary)" }}>
                Hold bitiş (UTC): {row.hold_expires_at}
              </span>
            ) : null}
            {(row.status === "confirmed" || row.status === "in_progress") && (
              <>
                <form
                  onSubmit={(e) => void proposeExtra(row.id, e)}
                  style={{ display: "grid", gap: "0.5rem" }}
                >
                  <input
                    placeholder="Ek iş açıklaması"
                    value={extraDesc[row.id] ?? ""}
                    onChange={(e) =>
                      setExtraDesc((prev) => ({
                        ...prev,
                        [row.id]: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                  <input
                    placeholder="Ek iş tutarı (TRY)"
                    value={extraPrice[row.id] ?? ""}
                    onChange={(e) =>
                      setExtraPrice((prev) => ({
                        ...prev,
                        [row.id]: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                  <Button type="submit" variant="secondary">
                    Ek iş öner (müşteri onayı gerekir)
                  </Button>
                </form>
                <Button type="button" onClick={() => void complete(row.id)}>
                  Tamamla
                </Button>
                <span style={{ color: "var(--kk-text-muted)", fontSize: "0.9rem" }}>
                  Örnek tutar formatı: {formatTryFromKurus(0)}
                </span>
              </>
            )}
          </article>
        ))
      )}
      <button type="button" className="kk-btn kk-btn-secondary" onClick={() => void load()}>
        Yenile
      </button>
    </div>
  );
}

const inputStyle: CSSProperties = {
  padding: "0.65rem 0.75rem",
  borderRadius: 10,
  border: "1px solid var(--kk-border)",
  font: "inherit",
};
