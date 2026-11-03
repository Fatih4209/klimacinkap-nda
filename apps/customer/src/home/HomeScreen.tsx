import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  brand,
  color,
  space,
  typography,
  type ServiceCategoryId,
} from "@klimacin/config";
import {
  getSupabaseBrowserClient,
  listCustomerAddresses,
  listCustomerOrders,
  resolvePublicSupabaseEnv,
  type CustomerOrderListItem,
  type TurkishAddress,
} from "@klimacin/shared";
import {
  BrandMark,
  EmptyState,
  ServiceCategoryGrid,
} from "@klimacin/ui-native";

type Props = {
  onSelectCategory: (id: ServiceCategoryId) => void;
  onOpenOrders: () => void;
};

export function HomeScreen({ onSelectCategory, onOpenOrders }: Props) {
  const client = getSupabaseBrowserClient(resolvePublicSupabaseEnv());
  const [address, setAddress] = useState<TurkishAddress | null>(null);
  const [active, setActive] = useState<CustomerOrderListItem[]>([]);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!client) {
      setNote("Supabase bağlı değil — adres/aktif sipariş yüklenmez.");
      return;
    }
    void (async () => {
      const addrs = await listCustomerAddresses(client);
      if (addrs.ok) {
        const def =
          addrs.data.find((a) => a.isDefault) ?? addrs.data[0] ?? null;
        setAddress(def);
      }
      const orders = await listCustomerOrders(client);
      if (orders.ok) {
        setActive(
          orders.data.filter((o) =>
            !["delivered", "cancelled", "completed", "rejected"].includes(
              o.status,
            ),
          ).slice(0, 5),
        );
      }
    })();
  }, [client]);

  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <BrandMark size="hero" />
        <Text style={styles.slogan}>{brand.slogan}</Text>
      </View>

      {address ? (
        <Pressable onPress={onOpenOrders} style={styles.address}>
          <Text style={styles.addressLabel}>Teslimat adresi</Text>
          <Text style={styles.addressBody}>
            {address.label ? `${address.label} · ` : ""}
            {address.cityName}/{address.districtName} · {address.line1}
          </Text>
        </Pressable>
      ) : (
        <EmptyState
          title="Adres seçilmedi"
          body="Hesap sekmesinden adres ekleyin. Harita API olmadan manuel TR il/ilçe girişi yeterli."
        />
      )}

      <ServiceCategoryGrid onSelect={onSelectCategory} />

      <Text style={styles.section}>Aktif işler</Text>
      {active.length === 0 ? (
        <EmptyState
          title="Aktif sipariş yok"
          body="Tekrar sipariş için Siparişler sekmesini kullanın (stok/fiyat yeniden doğrulanır)."
        />
      ) : (
        active.map((row) => (
          <Pressable
            key={`${row.kind}-${row.id}`}
            onPress={onOpenOrders}
            style={styles.activeRow}
          >
            <Text style={styles.activeTitle}>{row.label}</Text>
            <Text style={styles.activeMeta}>{row.status}</Text>
          </Pressable>
        ))
      )}

      {note ? <EmptyState title="Bağımlılık" body={note} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[5], paddingBottom: space[6] },
  hero: { gap: space[3] },
  slogan: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.lg,
    lineHeight: typography.size.lg * typography.lineHeight.snug,
    color: color.text.secondary,
  },
  address: {
    gap: space[1],
    padding: space[3],
    borderRadius: 12,
    backgroundColor: color.brand.mist,
  },
  addressLabel: {
    fontSize: typography.size.xs,
    color: color.brand.mid,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  addressBody: { color: color.text.primary },
  section: {
    fontWeight: "700",
    color: color.text.primary,
    fontSize: typography.size.md,
  },
  activeRow: {
    padding: space[3],
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderRadius: 12,
    gap: 4,
  },
  activeTitle: { fontWeight: "600", color: color.text.primary },
  activeMeta: { color: color.text.secondary, fontSize: typography.size.sm },
});
