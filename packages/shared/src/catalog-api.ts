import type { SupabaseClient } from "@supabase/supabase-js";
import {
  availableStock,
  mapCatalogErrorMessage,
  placeProductOrderSchema,
  upsertCatalogProductSchema,
  type CatalogCategory,
  type CatalogProductCard,
  type PlaceProductOrderInput,
  type UpsertCatalogProductInput,
} from "./catalog";

type RpcError = { message?: string };

export type CatalogApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail<T>(error: RpcError | string): CatalogApiResult<T> {
  if (typeof error === "string") {
    return { ok: false, error };
  }
  return { ok: false, error: mapCatalogErrorMessage(error) };
}

export async function upsertCatalogProduct(
  client: SupabaseClient,
  input: UpsertCatalogProductInput,
): Promise<CatalogApiResult<{ id: string }>> {
  const parsed = upsertCatalogProductSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Geçersiz ürün");
  }

  const { data, error } = await client.rpc("upsert_catalog_product", {
    p_business_id: parsed.data.businessId,
    p_category: parsed.data.category,
    p_name: parsed.data.name,
    p_unit_price_kurus: parsed.data.unitPriceKurus,
    p_brand: parsed.data.brand ?? null,
    p_volume_liters: parsed.data.volumeLiters ?? null,
    p_size_label: parsed.data.sizeLabel ?? null,
    p_deposit_kurus: parsed.data.depositKurus,
    p_requires_empty_return: parsed.data.requiresEmptyReturn,
    p_description: parsed.data.description ?? null,
    p_initial_stock: parsed.data.initialStock,
    p_product_id: parsed.data.productId ?? null,
  });

  if (error || !data) {
    return fail(error ?? { message: "CATALOG_PRODUCT_NOT_FOUND" });
  }
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function adjustProductStock(
  client: SupabaseClient,
  productId: string,
  quantityOnHand: number,
): Promise<CatalogApiResult<unknown>> {
  const { data, error } = await client.rpc("adjust_product_stock", {
    p_product_id: productId,
    p_quantity_on_hand: quantityOnHand,
  });
  if (error) {
    return fail(error);
  }
  return { ok: true, data };
}

export async function listCatalogProducts(
  client: SupabaseClient,
  category: CatalogCategory,
  opts?: { businessId?: string },
): Promise<CatalogApiResult<CatalogProductCard[]>> {
  let query = client
    .from("catalog_products")
    .select(
      "id, business_id, category, name, brand, volume_liters, size_label, unit_price_kurus, deposit_kurus, requires_empty_return, description, is_active, businesses(trade_name), product_stock(quantity_on_hand, quantity_reserved)",
    )
    .eq("category", category)
    .eq("is_active", true);

  if (opts?.businessId) {
    query = query.eq("business_id", opts.businessId);
  }

  const { data, error } = await query.order("name", { ascending: true });
  if (error) {
    return fail(error);
  }

  const cards: CatalogProductCard[] = (data ?? []).map((row) => {
    const business = row.businesses as
      | { trade_name?: string }
      | { trade_name?: string }[]
      | null;
    const tradeName = Array.isArray(business)
      ? (business[0]?.trade_name ?? "İşletme")
      : (business?.trade_name ?? "İşletme");

    const stock = row.product_stock as
      | {
          quantity_on_hand?: number;
          quantity_reserved?: number;
        }
      | {
          quantity_on_hand?: number;
          quantity_reserved?: number;
        }[]
      | null;

    const stockRow = Array.isArray(stock) ? stock[0] : stock;

    return {
      id: row.id as string,
      businessId: row.business_id as string,
      tradeName,
      category: row.category as CatalogCategory,
      name: row.name as string,
      brand: (row.brand as string | null) ?? null,
      volumeLiters:
        row.volume_liters == null ? null : Number(row.volume_liters),
      sizeLabel: (row.size_label as string | null) ?? null,
      unitPriceKurus: row.unit_price_kurus as number,
      depositKurus: row.deposit_kurus as number,
      requiresEmptyReturn: Boolean(row.requires_empty_return),
      description: (row.description as string | null) ?? null,
      quantityAvailable: availableStock(
        Number(stockRow?.quantity_on_hand ?? 0),
        Number(stockRow?.quantity_reserved ?? 0),
      ),
    };
  });

  return { ok: true, data: cards };
}

export async function placeProductOrder(
  client: SupabaseClient,
  input: PlaceProductOrderInput,
): Promise<CatalogApiResult<{ id: string }>> {
  const parsed = placeProductOrderSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Geçersiz sipariş");
  }

  const { data, error } = await client.rpc("place_product_order", {
    p_business_id: parsed.data.businessId,
    p_address_id: parsed.data.addressId,
    p_category: parsed.data.category,
    p_payment_method: parsed.data.paymentMethod,
    p_items: parsed.data.items,
    p_customer_note: parsed.data.customerNote ?? null,
  });

  if (error || !data) {
    return fail(error ?? { message: "CATALOG_ORDER_NOT_FOUND" });
  }
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function acceptProductOrder(
  client: SupabaseClient,
  orderId: string,
): Promise<CatalogApiResult<unknown>> {
  const { data, error } = await client.rpc("accept_product_order", {
    p_order_id: orderId,
  });
  if (error) {
    return fail(error);
  }
  return { ok: true, data };
}

export async function cancelProductOrder(
  client: SupabaseClient,
  orderId: string,
): Promise<CatalogApiResult<unknown>> {
  const { data, error } = await client.rpc("cancel_product_order", {
    p_order_id: orderId,
  });
  if (error) {
    return fail(error);
  }
  return { ok: true, data };
}

export async function deliverProductOrder(
  client: SupabaseClient,
  orderId: string,
  emptyContainersReturned = 0,
): Promise<CatalogApiResult<unknown>> {
  const { data, error } = await client.rpc("deliver_product_order", {
    p_order_id: orderId,
    p_empty_containers_returned: emptyContainersReturned,
  });
  if (error) {
    return fail(error);
  }
  return { ok: true, data };
}
