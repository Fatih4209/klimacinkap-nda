import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { color, radius, space, typography } from "@klimacin/config";
import {
  acceptKlimaOffer,
  confirmKlimaAppointment,
  createKlimaRequestDraft,
  decideKlimaExtraWork,
  formatTryFromKurus,
  getSupabaseBrowserClient,
  klimaJobTypeLabelsTr,
  klimaJobTypes,
  listKlimaOfferComparisons,
  publishKlimaRequest,
  resolvePublicSupabaseEnv,
  sortKlimaOffers,
  type KlimaJobType,
  type KlimaOfferComparison,
  type KlimaOfferSortKey,
} from "@klimacin/shared";
import { EmptyState } from "@klimacin/ui-native";

type Step =
  | "form"
  | "offers"
  | "hold"
  | "appointment";

type HoldState = {
  appointmentId: string;
  offer: KlimaOfferComparison;
  holdExpiresAt?: string;
};

type ExtraItem = {
  id: string;
  description: string;
  price_kurus: number;
  status: string;
};

export function KlimaFlow({ onBack }: { onBack: () => void }) {
  const client = useMemo(
    () => getSupabaseBrowserClient(resolvePublicSupabaseEnv()),
    [],
  );

  const [step, setStep] = useState<Step>("form");
  const [jobType, setJobType] = useState<KlimaJobType>("bakim");
  const [description, setDescription] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [offers, setOffers] = useState<KlimaOfferComparison[]>([]);
  const [sortBy, setSortBy] = useState<KlimaOfferSortKey>("price");
  const [hold, setHold] = useState<HoldState | null>(null);
  const [extras, setExtras] = useState<ExtraItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function requireSession() {
    if (!client) {
      return {
        ok: false as const,
        error:
          "Supabase bağlı değil. Klima talebi sahte olarak oluşturulmaz; önce ortam anahtarlarını ekleyin.",
      };
    }
    const { data, error: sessionError } = await client.auth.getSession();
    if (sessionError) {
      return { ok: false as const, error: sessionError.message };
    }
    const userId = data.session?.user?.id;
    if (!userId) {
      return {
        ok: false as const,
        error:
          "Giriş yapılmadı. SMS Auth sonrası klima talebi oluşturulabilir; oturum taklidi yok.",
      };
    }
    return { ok: true as const, client, userId };
  }

  async function loadDefaultAddress(userId: string) {
    if (!client) {
      return null;
    }
    const { data, error: addressError } = await client
      .from("customer_addresses")
      .select(
        "id, city_code, city_name, district_code, district_name, is_default",
      )
      .eq("profile_id", userId)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (addressError) {
      throw new Error(addressError.message);
    }
    return data;
  }

  async function submitRequest() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const session = await requireSession();
      if (!session.ok) {
        setError(session.error);
        return;
      }

      const address = await loadDefaultAddress(session.userId);
      if (!address) {
        setError(
          "Kayıtlı adres yok. Adres eklenmeden klima talebi açılamaz.",
        );
        return;
      }

      const draft = await createKlimaRequestDraft(session.client, session.userId, {
        addressId: address.id as string,
        jobType,
        description,
        cityCode: address.city_code as string,
        cityName: address.city_name as string,
        districtCode: address.district_code as string,
        districtName: address.district_name as string,
      });
      if (!draft.ok) {
        setError(draft.error);
        return;
      }

      const published = await publishKlimaRequest(session.client, draft.data.id);
      if (!published.ok) {
        setError(published.error);
        return;
      }

      setRequestId(draft.data.id);
      const listed = await listKlimaOfferComparisons(
        session.client,
        draft.data.id,
      );
      if (!listed.ok) {
        setError(listed.error);
        return;
      }
      setOffers(listed.data);
      setStep("offers");
      setInfo(
        listed.data.length === 0
          ? "Talebiniz açıldı. Bölgedeki onaylı işletmeler teklif verene kadar liste boş kalır."
          : null,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Beklenmeyen hata");
    } finally {
      setBusy(false);
    }
  }

  async function refreshOffers() {
    if (!requestId) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const session = await requireSession();
      if (!session.ok) {
        setError(session.error);
        return;
      }
      const listed = await listKlimaOfferComparisons(session.client, requestId);
      if (!listed.ok) {
        setError(listed.error);
        return;
      }
      setOffers(listed.data);
    } finally {
      setBusy(false);
    }
  }

  async function acceptOffer(offer: KlimaOfferComparison) {
    setBusy(true);
    setError(null);
    try {
      const session = await requireSession();
      if (!session.ok) {
        setError(session.error);
        return;
      }
      const accepted = await acceptKlimaOffer(session.client, offer.offerId);
      if (!accepted.ok) {
        setError(accepted.error);
        return;
      }
      const row = accepted.data as {
        id?: string;
        hold_expires_at?: string;
      };
      if (!row?.id) {
        setError("Rezervasyon oluşturulamadı.");
        return;
      }
      setHold({
        appointmentId: row.id,
        offer,
        holdExpiresAt: row.hold_expires_at,
      });
      setStep("hold");
    } finally {
      setBusy(false);
    }
  }

  async function confirmHold() {
    if (!hold) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const session = await requireSession();
      if (!session.ok) {
        setError(session.error);
        return;
      }
      const confirmed = await confirmKlimaAppointment(
        session.client,
        hold.appointmentId,
      );
      if (!confirmed.ok) {
        setError(confirmed.error);
        return;
      }
      setStep("appointment");
      await loadExtras(hold.appointmentId);
    } finally {
      setBusy(false);
    }
  }

  async function loadExtras(appointmentId: string) {
    const session = await requireSession();
    if (!session.ok) {
      setError(session.error);
      return;
    }
    const { data, error: extrasError } = await session.client
      .from("klima_extra_work_items")
      .select("id, description, price_kurus, status")
      .eq("appointment_id", appointmentId)
      .order("created_at", { ascending: true });
    if (extrasError) {
      setError(extrasError.message);
      return;
    }
    setExtras((data as ExtraItem[]) ?? []);
  }

  async function decideExtra(itemId: string, approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const session = await requireSession();
      if (!session.ok) {
        setError(session.error);
        return;
      }
      const result = await decideKlimaExtraWork(
        session.client,
        itemId,
        approve,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (hold) {
        await loadExtras(hold.appointmentId);
      }
    } finally {
      setBusy(false);
    }
  }

  const sortedOffers = sortKlimaOffers(offers, sortBy);

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onBack} accessibilityRole="button">
        <Text style={styles.back}>← Ana sayfa</Text>
      </Pressable>
      <Text style={styles.title}>Klima talebi</Text>
      <Text style={styles.subtitle}>
        Bakım, montaj, sökme, gaz veya arıza — teklif karşılaştırma, geçici
        rezervasyon ve ek iş onayı gerçek şema üzerinden yürür.
      </Text>

      {error ? <EmptyState title="İşlem yapılamadı" body={error} /> : null}
      {info ? <EmptyState title="Durum" body={info} /> : null}

      {step === "form" ? (
        <View style={styles.card}>
          <Text style={styles.label}>İş türü</Text>
          <View style={styles.chips}>
            {klimaJobTypes.map((type) => (
              <Pressable
                key={type}
                onPress={() => setJobType(type)}
                style={[
                  styles.chip,
                  jobType === type ? styles.chipActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    jobType === type ? styles.chipTextActive : null,
                  ]}
                >
                  {klimaJobTypeLabelsTr[type]}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Açıklama</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Sorunu veya ihtiyacı yazın"
            placeholderTextColor={color.text.muted}
            multiline
            style={styles.input}
          />
          <Pressable
            disabled={busy}
            onPress={submitRequest}
            style={[styles.primaryBtn, busy ? styles.disabled : null]}
          >
            <Text style={styles.primaryBtnText}>
              {busy ? "Gönderiliyor…" : "Talebi aç"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {step === "offers" ? (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Teklifler</Text>
            <Pressable onPress={refreshOffers} disabled={busy}>
              <Text style={styles.link}>Yenile</Text>
            </Pressable>
          </View>
          <View style={styles.chips}>
            {(
              [
                ["price", "Fiyat"],
                ["eta", "Erken"],
                ["completed", "Tamamlanan"],
              ] as const
            ).map(([key, label]) => (
              <Pressable
                key={key}
                onPress={() => setSortBy(key)}
                style={[
                  styles.chip,
                  sortBy === key ? styles.chipActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    sortBy === key ? styles.chipTextActive : null,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          {sortedOffers.length === 0 ? (
            <EmptyState
              title="Henüz teklif yok"
              body="Sahte teklif gösterilmez. İşletmeler teklif gönderince burada listelenir."
            />
          ) : (
            sortedOffers.map((offer) => (
              <View key={offer.offerId} style={styles.offer}>
                <Text style={styles.offerTitle}>{offer.tradeName}</Text>
                <Text style={styles.offerMeta}>
                  Fiyat {formatTryFromKurus(offer.priceKurus)} · Teşhis{" "}
                  {formatTryFromKurus(offer.diagnosisFeeKurus)} · ETA{" "}
                  {offer.etaMinutes} dk
                </Text>
                <Text style={styles.offerMeta}>
                  Tamamlanan iş: {offer.completedCount}
                  {offer.ratingAverage == null ? " · Puan: henüz yok" : ""}
                </Text>
                <Text style={styles.scope}>{offer.scopeSummary}</Text>
                <Pressable
                  disabled={busy}
                  onPress={() => acceptOffer(offer)}
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryBtnText}>
                    Geçici rezervasyon
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      ) : null}

      {step === "hold" && hold ? (
        <View style={styles.card}>
          <Text style={styles.label}>Onay özeti</Text>
          <Text style={styles.offerTitle}>{hold.offer.tradeName}</Text>
          <Text style={styles.offerMeta}>
            Toplam{" "}
            {formatTryFromKurus(
              hold.offer.priceKurus + hold.offer.diagnosisFeeKurus,
            )}{" "}
            (teşhis ayrı gösterilir)
          </Text>
          {hold.holdExpiresAt ? (
            <Text style={styles.offerMeta}>
              Rezervasyon süresi: {hold.holdExpiresAt} (UTC)
            </Text>
          ) : null}
          <Pressable
            disabled={busy}
            onPress={confirmHold}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Randevuyu onayla</Text>
          </Pressable>
        </View>
      ) : null}

      {step === "appointment" && hold ? (
        <View style={styles.card}>
          <Text style={styles.label}>Randevu onaylandı</Text>
          <Text style={styles.scope}>
            Ek iş müşteri onayı olmadan uygulanmaz. Bekleyen kalemler aşağıda.
          </Text>
          {extras.length === 0 ? (
            <EmptyState
              title="Ek iş yok"
              body="İşletme ek iş önerirse burada onayınıza sunulur."
            />
          ) : (
            extras.map((item) => (
              <View key={item.id} style={styles.offer}>
                <Text style={styles.offerTitle}>{item.description}</Text>
                <Text style={styles.offerMeta}>
                  {formatTryFromKurus(item.price_kurus)} · {item.status}
                </Text>
                {item.status === "proposed" ? (
                  <View style={styles.row}>
                    <Pressable
                      disabled={busy}
                      onPress={() => decideExtra(item.id, true)}
                      style={styles.secondaryBtn}
                    >
                      <Text style={styles.secondaryBtnText}>Onayla</Text>
                    </Pressable>
                    <Pressable
                      disabled={busy}
                      onPress={() => decideExtra(item.id, false)}
                      style={styles.secondaryBtn}
                    >
                      <Text style={styles.secondaryBtnText}>Reddet</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[4] },
  back: { color: color.brand.mid, fontWeight: "600" },
  title: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size["2xl"],
    fontWeight: "700",
    color: color.text.primary,
  },
  subtitle: {
    color: color.text.secondary,
    lineHeight: typography.size.md * typography.lineHeight.normal,
  },
  card: {
    gap: space[3],
    padding: space[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border.subtle,
    backgroundColor: color.surface.raised,
  },
  label: {
    fontWeight: "600",
    color: color.text.primary,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  chip: {
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderRadius: radius.sm,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  chipActive: {
    backgroundColor: color.klima.soft,
    borderColor: color.klima.solid,
  },
  chipText: { color: color.text.secondary },
  chipTextActive: { color: color.klima.solid, fontWeight: "700" },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderRadius: radius.sm,
    padding: space[3],
    textAlignVertical: "top",
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
    borderColor: color.brand.mid,
    borderRadius: 999,
    paddingVertical: space[2],
    paddingHorizontal: space[4],
    alignItems: "center",
    marginTop: space[2],
  },
  secondaryBtnText: { color: color.brand.deep, fontWeight: "600" },
  disabled: { opacity: 0.55 },
  offer: {
    gap: space[1],
    paddingVertical: space[3],
    borderTopWidth: 1,
    borderTopColor: color.border.subtle,
  },
  offerTitle: { fontWeight: "700", color: color.text.primary },
  offerMeta: { color: color.text.secondary, fontSize: typography.size.sm },
  scope: { color: color.text.primary },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  row: { flexDirection: "row", gap: space[2] },
  link: { color: color.brand.mid, fontWeight: "600" },
});
