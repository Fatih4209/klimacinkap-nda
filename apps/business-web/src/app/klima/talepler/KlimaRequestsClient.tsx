"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  klimaJobTypeLabelsTr,
  type KlimaJobType,
} from "@klimacin/shared";
import { EmptyState } from "@klimacin/ui";
import { getBusinessSupabase } from "@/lib/supabase";

type RequestRow = {
  id: string;
  job_type: KlimaJobType;
  description: string;
  city_name: string;
  district_name: string;
  status: string;
  created_at: string;
};

export function KlimaRequestsClient() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const client = getBusinessSupabase();
    if (!client) {
      setError("Supabase istemcisi oluşturulamadı.");
      setLoading(false);
      return;
    }

    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      setError(
        "Oturum yok. SMS Auth sonrası açık klima talepleri listelenir; giriş taklidi yok.",
      );
      setRows([]);
      setLoading(false);
      return;
    }

    const { data, error: queryError } = await client
      .from("klima_requests")
      .select(
        "id, job_type, description, city_name, district_name, status, created_at",
      )
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setRows([]);
    } else {
      setRows((data as RequestRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p style={{ color: "var(--kk-text-secondary)" }}>Yükleniyor…</p>;
  }

  if (error) {
    return <EmptyState title="Liste alınamadı">{error}</EmptyState>;
  }

  if (rows.length === 0) {
    return (
      <EmptyState title="Açık klima talebi yok">
        Bölgenizde yeni talep açılınca burada görünür.
      </EmptyState>
    );
  }

  return (
    <div style={{ display: "grid", gap: "0.85rem" }}>
      {rows.map((row) => (
        <article
          key={row.id}
          className="kk-category-tile"
          data-accent="klima"
          style={{ gap: "0.35rem" }}
        >
          <strong>
            {klimaJobTypeLabelsTr[row.job_type]} · {row.district_name},{" "}
            {row.city_name}
          </strong>
          <span style={{ color: "var(--kk-text-secondary)" }}>
            {row.description}
          </span>
          <Link href={`/klima/teklif/${row.id}`}>Teklif ver →</Link>
        </article>
      ))}
      <button type="button" className="kk-btn kk-btn-secondary" onClick={() => void load()}>
        Yenile
      </button>
    </div>
  );
}
