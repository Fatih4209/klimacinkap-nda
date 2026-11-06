import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";
import { color, radius, space, typography } from "@klimacin/config";
import {
  assignmentStatusLabelsTr,
  canShareLocation,
  completeAssignment,
  getSupabaseBrowserClient,
  jobKindLabelsTr,
  listMyAssignments,
  resolvePublicSupabaseEnv,
  updateAssignmentStatus,
  type AssignmentStatus,
  type JobAssignment,
} from "@klimacin/shared";
import { EmptyState } from "@klimacin/ui-native";
import {
  enqueueLocationPing,
  flushLocationQueue,
} from "./offlineLocationQueue";

const TRACK_INTERVAL_MS = 20_000;

export function StaffJobsScreen() {
  const client = useMemo(
    () => getSupabaseBrowserClient(resolvePublicSupabaseEnv()),
    [],
  );
  const [jobs, setJobs] = useState<JobAssignment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      if (!client) {
        setError(
          "Supabase bağlı değil. Atanmış işler sahte listelenmez.",
        );
        setJobs([]);
        return;
      }
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData.session) {
        setError(
          "Oturum yok. Davet ile personel girişi gerekir; açık kayıt / bypass yok.",
        );
        setJobs([]);
        return;
      }

      const flush = await flushLocationQueue(client);
      if (flush.flushed > 0) {
        setInfo(`${flush.flushed} çevrimdışı konum kaydı gönderildi.`);
      }

      const listed = await listMyAssignments(client);
      if (!listed.ok) {
        setError(listed.error);
        setJobs([]);
        return;
      }
      // Personel yalnızca kendi atamalarını görür (API staff_profile_id = auth).
      setJobs(listed.data);
    } finally {
      setBusy(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  async function changeStatus(job: JobAssignment, status: AssignmentStatus) {
    if (!client) {
      setError("Supabase bağlı değil.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await updateAssignmentStatus(client, job.id, status);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (status === "cancelled" || status === "completed") {
        stopTracking();
      }
      if (canShareLocation(status)) {
        await startTracking(job.id);
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function startTracking(assignmentId: string) {
    stopTracking();
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setError(
        "Konum izni verilmedi. Canlı takip için yolda/sahada izin gerekir; izin olmadan konum uydurulmaz.",
      );
      return;
    }
    setTrackingId(assignmentId);
    setInfo("Konum paylaşımı açık (yalnızca bu atama için).");

    const tick = async () => {
      if (!client) {
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const payload = {
          assignmentId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy ?? undefined,
          recordedAt: new Date(pos.timestamp).toISOString(),
        };
        const posted = await postStaffLocationSafe(client, payload);
        if (!posted) {
          await enqueueLocationPing(payload);
          setInfo(
            "Konum kuyruğa alındı (çevrimdışı senkron). Sahte konum yok.",
          );
        }
      } catch {
        setError("Konum okunamadı; simüle konum gönderilmez.");
      }
    };

    await tick();
    timerRef.current = setInterval(() => {
      void tick();
    }, TRACK_INTERVAL_MS);
  }

  function stopTracking() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTrackingId(null);
  }

  async function postStaffLocationSafe(
    supabase: NonNullable<typeof client>,
    payload: {
      assignmentId: string;
      lat: number;
      lng: number;
      accuracyM?: number;
      recordedAt: string;
    },
  ): Promise<boolean> {
    const { postStaffLocation } = await import("@klimacin/shared");
    const result = await postStaffLocation(supabase, payload);
    return result.ok;
  }

  async function complete(job: JobAssignment) {
    if (!client) {
      setError("Supabase bağlı değil.");
      return;
    }
    const code = codes[job.id] ?? "";
    setBusy(true);
    setError(null);
    try {
      const result = await completeAssignment(client, job.id, code);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      stopTracking();
      setInfo("İş tamamlandı; konum paylaşımı kesildi.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Pressable disabled={busy} onPress={load} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>
          {busy ? "Yükleniyor…" : "Atamaları yenile"}
        </Text>
      </Pressable>

      {error ? <EmptyState title="İşlem yapılamadı" body={error} /> : null}
      {info ? <EmptyState title="Durum" body={info} /> : null}

      {jobs.length === 0 ? (
        <EmptyState
          title="Atanmış iş yok"
          body="Yalnızca size atanan işler görünür. İşletme panelinden atama gerekir."
        />
      ) : (
        jobs.map((job) => (
          <View key={job.id} style={styles.card}>
            <Text style={styles.title}>{jobKindLabelsTr[job.kind]}</Text>
            <Text style={styles.meta}>
              {assignmentStatusLabelsTr[job.status]} · {job.assignedAt}
            </Text>
            <Text style={styles.meta}>Atama: {job.id}</Text>
            {trackingId === job.id ? (
              <Text style={styles.liveNote}>
                Konum paylaşılıyor (cihazdan). Eski ping müşteriye canlı
                gösterilmez.
              </Text>
            ) : null}

            <View style={styles.row}>
              {job.status === "assigned" ? (
                <>
                  <Action
                    label="Kabul"
                    disabled={busy}
                    onPress={() => void changeStatus(job, "accepted")}
                  />
                  <Action
                    label="Reddet"
                    disabled={busy}
                    onPress={() => void changeStatus(job, "cancelled")}
                  />
                </>
              ) : null}
              {job.status === "accepted" ? (
                <Action
                  label="Yola çık"
                  disabled={busy}
                  onPress={() => void changeStatus(job, "en_route")}
                />
              ) : null}
              {job.status === "en_route" ? (
                <Action
                  label="Sahadayım"
                  disabled={busy}
                  onPress={() => void changeStatus(job, "on_site")}
                />
              ) : null}
            </View>

            {canShareLocation(job.status) ? (
              <View style={styles.completeBox}>
                <Text style={styles.meta}>
                  Tamamlama kodu (işletme/müşteri paylaşır)
                </Text>
                <TextInput
                  value={codes[job.id] ?? ""}
                  onChangeText={(text) => {
                    setCodes((prev) => ({ ...prev, [job.id]: text }));
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="6 haneli kod"
                  placeholderTextColor={color.text.muted}
                  style={styles.input}
                />
                <Action
                  label="Tamamla"
                  disabled={busy}
                  onPress={() => void complete(job)}
                />
              </View>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

function Action({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.secondaryBtn, disabled ? styles.disabled : null]}
    >
      <Text style={styles.secondaryBtnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[4] },
  card: {
    gap: space[2],
    padding: space[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border.subtle,
    backgroundColor: color.surface.raised,
  },
  title: {
    fontWeight: "700",
    fontSize: typography.size.lg,
    color: color.text.primary,
  },
  meta: { color: color.text.secondary, fontSize: typography.size.sm },
  liveNote: { color: color.brand.mid, fontWeight: "600" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  completeBox: { gap: space[2], marginTop: space[2] },
  input: {
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderRadius: radius.sm,
    padding: space[3],
    color: color.text.primary,
  },
  primaryBtn: {
    backgroundColor: color.brand.deep,
    borderRadius: 999,
    paddingVertical: space[3],
    alignItems: "center",
  },
  primaryBtnText: { color: color.text.inverse, fontWeight: "700" },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: color.border.strong,
    borderRadius: 999,
    paddingVertical: space[2],
    paddingHorizontal: space[4],
  },
  secondaryBtnText: { color: color.brand.soft, fontWeight: "600" },
  disabled: { opacity: 0.55 },
});
