import { useEffect, useState } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  brand,
  color,
  motion,
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
  FadeRise,
  ServiceCategoryGrid,
} from "@klimacin/ui-native";

type Props = {
  onSelectCategory: (id: ServiceCategoryId) => void;
  onOpenOrders: () => void;
  onOpenAccount: () => void;
};

const MIN_HERO = Math.max(Dimensions.get("window").height * 0.72, 520);

/**
 * First viewport = one composition: brand hero + equal Klima/Su/Tüp.
 * Address / aktif işler live below the fold — not hero clutter.
 */
export function HomeScreen({
  onSelectCategory,
  onOpenOrders,
  onOpenAccount,
}: Props) {
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
          orders.data
            .filter(
              (o) =>
                ![
                  "delivered",
                  "cancelled",
                  "completed",
                  "expired",
                ].includes(o.status),
            )
            .slice(0, 5),
        );
      }
    })();
  }, [client]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.hero, { minHeight: MIN_HERO }]}>
        <FadeRise delay={0}>
          <Pressable onPress={onOpenAccount} style={styles.addressRail}>
            <Text style={styles.addressLabel}>Teslimat</Text>
            <Text style={styles.addressBody} numberOfLines={1}>
              {address
                ? `${address.cityName}/${address.districtName} · ${address.line1}`
                : "Adres ekle — Hesap"}
            </Text>
          </Pressable>
        </FadeRise>

        <FadeRise delay={motion.fast} style={styles.brandBlock}>
          <BrandMark size="hero" tone="chalk" style={styles.brand} />
          <Text style={styles.slogan}>{brand.slogan}</Text>
        </FadeRise>

        <View style={styles.categories}>
          <ServiceCategoryGrid onSelect={onSelectCategory} tone="night" />
        </View>
      </View>

      <View style={styles.below}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1 },
  hero: {
    justifyContent: "space-between",
    paddingHorizontal: space[5],
    paddingTop: space[4],
    paddingBottom: space[7],
    gap: space[6],
  },
  addressRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingVertical: space[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border.subtle,
  },
  addressLabel: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.xs,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: color.brand.glow,
  },
  addressBody: {
    flex: 1,
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.sm,
    color: color.text.secondary,
  },
  brandBlock: {
    gap: space[4],
    paddingTop: space[6],
  },
  brand: {
    maxWidth: 340,
  },
  slogan: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.lg,
    lineHeight: typography.size.lg * typography.lineHeight.snug,
    color: color.text.secondary,
    maxWidth: 320,
  },
  categories: {
    marginHorizontal: -space[5],
    paddingHorizontal: space[5],
  },
  below: {
    gap: space[3],
    paddingHorizontal: space[5],
    paddingTop: space[6],
    paddingBottom: space[10],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border.subtle,
  },
  section: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: "700",
    color: color.text.primary,
    fontSize: typography.size.sm,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  activeRow: {
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border.subtle,
    gap: 4,
  },
  activeTitle: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: "600",
    color: color.text.primary,
  },
  activeMeta: {
    color: color.text.secondary,
    fontSize: typography.size.sm,
  },
});
