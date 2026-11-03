import type { SupabaseClient } from "@supabase/supabase-js";

export type CustomerOrderListItem = {
  kind: "product" | "klima";
  id: string;
  status: string;
  label: string;
  createdAt: string;
  category?: string;
  /** For repeat: product order fields */
  businessId?: string;
  addressId?: string;
};

export type CustomerOrdersResult =
  | { ok: true; data: CustomerOrderListItem[] }
  | { ok: false; error: string };

export async function listCustomerOrders(
  client: SupabaseClient | null,
): Promise<CustomerOrdersResult> {
  if (!client) {
    return { ok: false, error: "Supabase bağlı değil." };
  }
  const { data: session } = await client.auth.getSession();
  if (!session.session?.user) {
    return { ok: false, error: "Oturum gerekli. Auth bypass yok." };
  }
  const uid = session.session.user.id;

  const [products, klima] = await Promise.all([
    client
      .from("product_orders")
      .select(
        "id, status, category, business_id, address_id, created_at, city_name, district_name",
      )
      .eq("customer_id", uid)
      .order("created_at", { ascending: false })
      .limit(40),
    client
      .from("klima_requests")
      .select("id, status, service_type, address_id, created_at")
      .eq("customer_id", uid)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  if (products.error) return { ok: false, error: products.error.message };
  if (klima.error) return { ok: false, error: klima.error.message };

  const items: CustomerOrderListItem[] = [
    ...(products.data ?? []).map((row) => ({
      kind: "product" as const,
      id: row.id as string,
      status: row.status as string,
      category: row.category as string,
      businessId: row.business_id as string,
      addressId: row.address_id as string,
      label: `${row.category} · ${row.city_name}/${row.district_name}`,
      createdAt: row.created_at as string,
    })),
    ...(klima.data ?? []).map((row) => ({
      kind: "klima" as const,
      id: row.id as string,
      status: row.status as string,
      addressId: row.address_id as string,
      label: `Klima · ${row.service_type}`,
      createdAt: row.created_at as string,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { ok: true, data: items };
}

/**
 * Repeat product order: re-fetches live product/stock/region — refuses stale.
 * Does not invent prices; caller must place via place_product_order RPC.
 */
export async function prepareProductOrderRepeat(
  client: SupabaseClient | null,
  orderId: string,
): Promise<
  | {
      ok: true;
      data: {
        businessId: string;
        addressId: string;
        category: string;
        paymentMethod: string;
        items: { productId: string; quantity: number; unitPriceKurus: number }[];
      };
    }
  | { ok: false; error: string }
> {
  if (!client) {
    return { ok: false, error: "Supabase bağlı değil." };
  }
  const { data: session } = await client.auth.getSession();
  if (!session.session?.user) {
    return { ok: false, error: "Oturum gerekli." };
  }

  const { data: order, error } = await client
    .from("product_orders")
    .select(
      "id, business_id, address_id, category, payment_method, customer_id, product_order_items(product_id, quantity)",
    )
    .eq("id", orderId)
    .eq("customer_id", session.session.user.id)
    .maybeSingle();

  if (error || !order) {
    return { ok: false, error: error?.message ?? "Sipariş bulunamadı." };
  }

  const items = (order.product_order_items as
    | { product_id: string; quantity: number }[]
    | null) ?? [];
  if (items.length === 0) {
    return { ok: false, error: "Tekrar için kalem yok." };
  }

  const refreshed: {
    productId: string;
    quantity: number;
    unitPriceKurus: number;
  }[] = [];

  for (const item of items) {
    const { data: product, error: pErr } = await client
      .from("catalog_products")
      .select(
        "id, unit_price_kurus, is_active, product_stock(quantity_on_hand, quantity_reserved)",
      )
      .eq("id", item.product_id)
      .maybeSingle();
    if (pErr || !product || !product.is_active) {
      return {
        ok: false,
        error: "Ürün artık aktif değil; tekrar sipariş oluşturulmadı.",
      };
    }
    const stock = Array.isArray(product.product_stock)
      ? product.product_stock[0]
      : product.product_stock;
    const available =
      Number(stock?.quantity_on_hand ?? 0) -
      Number(stock?.quantity_reserved ?? 0);
    if (available < item.quantity) {
      return {
        ok: false,
        error: `Stok yetersiz (ürün ${item.product_id}). Eski fiyat/stok kullanılmaz.`,
      };
    }
    refreshed.push({
      productId: item.product_id,
      quantity: item.quantity,
      unitPriceKurus: product.unit_price_kurus as number,
    });
  }

  return {
    ok: true,
    data: {
      businessId: order.business_id as string,
      addressId: order.address_id as string,
      category: order.category as string,
      paymentMethod: order.payment_method as string,
      items: refreshed,
    },
  };
}
