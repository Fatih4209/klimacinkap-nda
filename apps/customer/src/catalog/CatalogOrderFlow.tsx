import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { color, radius, space, typography } from "@klimacin/config";
import {
  cancelProductOrder,
  catalogCategoryLabelsTr,
  doorPaymentLabelsTr,
  formatTryFromKurus,
  getSupabaseBrowserClient,
  listCatalogProducts,
  orderPayableKurus,
  placeProductOrder,
  resolvePublicSupabaseEnv,
  type CatalogCategory,
  type CatalogProductCard,
  type DoorPaymentMethod,
} from "@klimacin/shared";
import { EmptyState } from "@klimacin/ui-native";

type CartLine = { product: CatalogProductCard; quantity: number };

export function CatalogOrderFlow({
  category,
  onBack,
}: {
  category: CatalogCategory;
  onBack: () => void;
}) {
  const client = useMemo(
    () => getSupabaseBrowserClient(resolvePublicSupabaseEnv()),
    [],
  );
  const [products, setProducts] = useState<CatalogProductCard[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] =
    useState<DoorPaymentMethod>("cash_on_delivery");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void loadProducts();
    // Auto-load once on mount; refresh button remains available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  async function requireSession() {
    if (!client) {
      return {
        ok: false as const,
        error:
          "Supabase bağlı değil. Katalog ve sipariş sahte oluşturulmaz.",
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
        error: "Giriş yapılmadı. SMS Auth sonrası sipariş verilebilir.",
      };
    }
    return { ok: true as const, client, userId };
  }

  async function loadProducts() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const session = await requireSession();
      if (!session.ok) {
        setError(session.error);
        setProducts([]);
        setLoaded(true);
        return;
      }
      const listed = await listCatalogProducts(session.client, category);
      if (!listed.ok) {
        setError(listed.error);
        setProducts([]);
      } else {
        setProducts(listed.data);
        if (listed.data.length === 0) {
          setInfo(
            "Bu kategoride aktif ürün yok. Sahte ürün listelenmez; işletmeler katalog ekleyince görünür.",
          );
        }
      }
      setLoaded(true);
    } finally {
      setBusy(false);
    }
  }

  function addToCart(product: CatalogProductCard) {
    if (product.quantityAvailable < 1) {
      setError("Bu üründe satılabilir stok yok.");
      return;
    }
    setError(null);
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        if (existing.quantity + 1 > product.quantityAvailable) {
          setError("Stok üstü adet eklenemez.");
          return prev;
        }
        return prev.map((l) =>
          l.product.id === product.id
            ? { ...l, quantity: l.quantity + 1 }
            : l,
        );
      }
      if (
        prev.length > 0 &&
        prev[0]!.product.businessId !== product.businessId
      ) {
        setError("Tek siparişte yalnızca aynı işletmenin ürünleri olabilir.");
        return prev;
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  async function placeOrder() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const session = await requireSession();
      if (!session.ok) {
        setError(session.error);
        return;
      }
      if (cart.length === 0) {
        setError("Sepet boş.");
        return;
      }

      const { data: address, error: addressError } = await session.client
        .from("customer_addresses")
        .select("id")
        .eq("profile_id", session.userId)
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (addressError) {
        setError(addressError.message);
        return;
      }
      if (!address) {
        setError("Kayıtlı adres yok; sipariş açılamaz.");
        return;
      }

      const businessId = cart[0]!.product.businessId;
      const result = await placeProductOrder(session.client, {
        businessId,
        addressId: address.id as string,
        category,
        paymentMethod,
        items: cart.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
        })),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setOrderId(result.data.id);
      setCart([]);
      setInfo(
        "Sipariş alındı. Ödeme kapıda; platform tahsilat yapmış gibi gösterilmez.",
      );
      await loadProducts();
    } finally {
      setBusy(false);
    }
  }

  async function cancelOrder() {
    if (!orderId) {
      setError("İptal edilecek sipariş yok.");
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
      const result = await cancelProductOrder(session.client, orderId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInfo("Sipariş iptal edildi; rezervasyon stoktan düşüldü.");
      setOrderId(null);
      await loadProducts();
    } finally {
      setBusy(false);
    }
  }

  const cartSubtotal = cart.reduce(
    (sum, l) => sum + l.product.unitPriceKurus * l.quantity,
    0,
  );
  const cartDeposit = cart.reduce(
    (sum, l) => sum + l.product.depositKurus * l.quantity,
    0,
  );

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onBack} accessibilityRole="button">
        <Text style={styles.back}>← Ana sayfa</Text>
      </Pressable>
      <Text style={styles.title}>{catalogCategoryLabelsTr[category]}</Text>
      <Text style={styles.subtitle}>
        {category === "su"
          ? "Marka, hacim, stok, depozito ve boş kap kuralları gerçek şemadan gelir."
          : "Net ürün kartı. Kurulum/tehlikeli yönlendirme yoktur."}
      </Text>

      {error ? <EmptyState title="İşlem yapılamadı" body={error} /> : null}
      {info ? <EmptyState title="Durum" body={info} /> : null}

      <Pressable
        disabled={busy}
        onPress={loadProducts}
        style={[styles.primaryBtn, busy ? styles.disabled : null]}
      >
        <Text style={styles.primaryBtnText}>
          {loaded ? "Katalogu yenile" : "Katalogu yükle"}
        </Text>
      </Pressable>

      {products.map((product) => (
        <View key={product.id} style={styles.card}>
          <Text style={styles.offerTitle}>
            {product.name}
            {product.brand ? ` · ${product.brand}` : ""}
          </Text>
          <Text style={styles.meta}>{product.tradeName}</Text>
          <Text style={styles.meta}>
            {product.volumeLiters != null
              ? `${product.volumeLiters} L`
              : product.sizeLabel}
            {" · "}
            {formatTryFromKurus(product.unitPriceKurus)}
            {product.depositKurus > 0
              ? ` · Depozito ${formatTryFromKurus(product.depositKurus)}`
              : ""}
          </Text>
          <Text style={styles.meta}>
            Stok: {product.quantityAvailable}
            {product.requiresEmptyReturn ? " · Boş kap iadesi beklenir" : ""}
          </Text>
          {product.description ? (
            <Text style={styles.scope}>{product.description}</Text>
          ) : null}
          <Pressable
            disabled={busy || product.quantityAvailable < 1}
            onPress={() => addToCart(product)}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>Sepete ekle</Text>
          </Pressable>
        </View>
      ))}

      {cart.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.label}>Sepet</Text>
          {cart.map((line) => (
            <Text key={line.product.id} style={styles.meta}>
              {line.quantity}× {line.product.name}
            </Text>
          ))}
          <Text style={styles.scope}>
            Ara toplam {formatTryFromKurus(cartSubtotal)} · Depozito{" "}
            {formatTryFromKurus(cartDeposit)} · Kapıda{" "}
            {formatTryFromKurus(
              orderPayableKurus({
                subtotalKurus: cartSubtotal,
                depositKurusTotal: cartDeposit,
              }),
            )}
          </Text>
          <View style={styles.chips}>
            {(Object.keys(doorPaymentLabelsTr) as DoorPaymentMethod[]).map(
              (method) => (
                <Pressable
                  key={method}
                  onPress={() => setPaymentMethod(method)}
                  style={[
                    styles.chip,
                    paymentMethod === method ? styles.chipActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      paymentMethod === method
                        ? styles.chipTextActive
                        : null,
                    ]}
                  >
                    {doorPaymentLabelsTr[method]}
                  </Text>
                </Pressable>
              ),
            )}
          </View>
          <Pressable
            disabled={busy}
            onPress={placeOrder}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Siparişi gönder</Text>
          </Pressable>
        </View>
      ) : null}

      {orderId ? (
        <View style={styles.card}>
          <Text style={styles.label}>Son sipariş</Text>
          <Text style={styles.meta}>{orderId}</Text>
          <Pressable
            disabled={busy}
            onPress={cancelOrder}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>İptal et</Text>
          </Pressable>
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
    gap: space[2],
    padding: space[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border.subtle,
    backgroundColor: color.surface.raised,
  },
  label: { fontWeight: "600", color: color.text.primary },
  offerTitle: { fontWeight: "700", color: color.text.primary },
  meta: { color: color.text.secondary, fontSize: typography.size.sm },
  scope: { color: color.text.primary },
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
    marginTop: space[1],
    alignSelf: "flex-start",
  },
  secondaryBtnText: { color: color.brand.deep, fontWeight: "600" },
  disabled: { opacity: 0.55 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  chip: {
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderRadius: radius.sm,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  chipActive: {
    backgroundColor: color.brand.soft,
    borderColor: color.brand.mid,
  },
  chipText: { color: color.text.secondary },
  chipTextActive: { color: color.brand.deep, fontWeight: "700" },
});
