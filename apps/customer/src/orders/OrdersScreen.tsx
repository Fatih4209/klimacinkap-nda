import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { color, space, typography } from "@klimacin/config";
import {
  getSupabaseBrowserClient,
  listCustomerOrders,
  placeProductOrder,
  prepareProductOrderRepeat,
  resolvePublicSupabaseEnv,
  submitJobRating,
  type CustomerOrderListItem,
} from "@klimacin/shared";
import { EmptyState } from "@klimacin/ui-native";

export function OrdersScreen({
  focusOrderId,
}: {
  focusOrderId?: string | null;
}) {
  const client = getSupabaseBrowserClient(resolvePublicSupabaseEnv());
  const [rows, setRows] = useState<CustomerOrderListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const result = await listCustomerOrders(client);
    if (!result.ok) {
      setError(result.error);
      setRows([]);
      return;
    }
    setError(null);
    setRows(result.data);
  }, [client]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (focusOrderId) {
      setInfo(`Derin bağlantı siparişi: ${focusOrderId}`);
    }
  }, [focusOrderId]);

  async function onRepeat(orderId: string) {
    setBusy(true);
    setError(null);
    setInfo(null);
    const prepared = await prepareProductOrderRepeat(client, orderId);
    if (!prepared.ok) {
      setError(prepared.error);
      setBusy(false);
      return;
    }
    if (!client) {
      setError("Supabase yok.");
      setBusy(false);
      return;
    }
    const placed = await placeProductOrder(client, {
      businessId: prepared.data.businessId,
      addressId: prepared.data.addressId,
      category: prepared.data.category as "su" | "tup",
      paymentMethod: prepared.data.paymentMethod as
        | "cash_on_delivery"
        | "pos_on_delivery",
      items: prepared.data.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
    });
    setBusy(false);
    if (!placed.ok) {
      setError(placed.error);
      return;
    }
    setInfo(`Tekrar sipariş oluşturuldu: ${placed.data.id} (güncel fiyat/stok).`);
    await reload();
  }

  async function onRate(row: CustomerOrderListItem, score: number) {
    setBusy(true);
    setError(null);
    setInfo(null);
    const result = await submitJobRating(client, {
      score,
      productOrderId: row.kind === "product" ? row.id : undefined,
      klimaAppointmentId:
        row.kind === "klima" ? row.klimaAppointmentId : undefined,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setInfo(`Puan kaydedildi: ${result.data.score}/5`);
  }

  if (!client) {
    return (
      <EmptyState
        title="Siparişler"
        body="Supabase env yok. Liste/tekrar uydurulmaz."
      />
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Siparişler</Text>
      <Pressable onPress={() => void reload()}>
        <Text style={styles.link}>Yenile</Text>
      </Pressable>
      {error ? <EmptyState title="Siparişler" body={error} /> : null}
      {info ? <EmptyState title="Durum" body={info} /> : null}
      {rows.length === 0 && !error ? (
        <EmptyState
          title="Kayıt yok"
          body="Aktif veya geçmiş sipariş/talep burada görünür."
        />
      ) : null}
      {rows.map((row) => (
        <View
          key={`${row.kind}-${row.id}`}
          style={[
            styles.card,
            focusOrderId === row.id ? styles.cardFocus : null,
          ]}
        >
          <Text style={styles.cardTitle}>{row.label}</Text>
          <Text style={styles.meta}>
            {row.status} · {new Date(row.createdAt).toLocaleString("tr-TR")}
          </Text>
          {row.kind === "product" ? (
            <Pressable
              disabled={busy}
              onPress={() => void onRepeat(row.id)}
              style={styles.repeat}
            >
              <Text style={styles.repeatText}>
                Tekrarla (stok/fiyat yeniden doğrulanır)
              </Text>
            </Pressable>
          ) : null}
          {row.canRate ? (
            <View style={styles.rateRow}>
              <Text style={styles.meta}>Puan ver:</Text>
              {[1, 2, 3, 4, 5].map((score) => (
                <Pressable
                  key={score}
                  disabled={busy}
                  onPress={() => void onRate(row, score)}
                  style={styles.rateChip}
                >
                  <Text style={styles.rateChipText}>{score}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[3], paddingBottom: space[8] },
  title: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size["2xl"],
    color: color.text.primary,
  },
  link: { color: color.brand.mid, fontWeight: "600" },
  card: {
    gap: space[1],
    padding: space[3],
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderRadius: 12,
    backgroundColor: color.surface.raised,
  },
  cardFocus: {
    borderColor: color.brand.mid,
    borderWidth: 2,
  },
  cardTitle: {
    fontWeight: "700",
    color: color.text.primary,
  },
  meta: { color: color.text.secondary, fontSize: typography.size.sm },
  repeat: {
    marginTop: space[2],
    paddingVertical: space[2],
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: color.brand.mid,
  },
  repeatText: { color: color.brand.deep, fontWeight: "600", fontSize: 13 },
  rateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space[1],
    marginTop: space[2],
  },
  rateChip: {
    minWidth: 32,
    paddingVertical: space[1],
    paddingHorizontal: space[2],
    borderRadius: 8,
    backgroundColor: color.brand.deep,
    alignItems: "center",
  },
  rateChipText: { color: color.text.inverse, fontWeight: "700" },
});
