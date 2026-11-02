import { z } from "zod";
import { kurusSchema } from "./money";

export const catalogCategories = ["su", "tup"] as const;
export type CatalogCategory = (typeof catalogCategories)[number];
export const catalogCategorySchema = z.enum(catalogCategories);

export const catalogCategoryLabelsTr: Record<CatalogCategory, string> = {
  su: "Damacana Su",
  tup: "Tüp",
};

export const doorPaymentMethods = [
  "cash_on_delivery",
  "pos_on_delivery",
] as const;
export type DoorPaymentMethod = (typeof doorPaymentMethods)[number];
export const doorPaymentMethodSchema = z.enum(doorPaymentMethods);

export const doorPaymentLabelsTr: Record<DoorPaymentMethod, string> = {
  cash_on_delivery: "Kapıda nakit",
  pos_on_delivery: "Kapıda POS",
};

export const productOrderStatuses = [
  "pending",
  "accepted",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;
export type ProductOrderStatus = (typeof productOrderStatuses)[number];

/** Words banned in tüp product descriptions (no dangerous install guidance). */
export const TUP_DESCRIPTION_BLOCKLIST =
  /(montaj|kurulum|bağla|vanayı|kaçak|ateş|kaynak)/i;

export const upsertCatalogProductSchema = z
  .object({
    businessId: z.string().uuid(),
    productId: z.string().uuid().optional(),
    category: catalogCategorySchema,
    name: z.string().trim().min(2).max(160),
    brand: z.string().trim().min(1).max(80).optional(),
    volumeLiters: z.number().positive().max(1000).optional(),
    sizeLabel: z.string().trim().min(1).max(40).optional(),
    unitPriceKurus: kurusSchema,
    depositKurus: kurusSchema.default(0),
    requiresEmptyReturn: z.boolean().default(false),
    description: z.string().trim().max(500).optional(),
    initialStock: z.number().int().nonnegative().default(0),
  })
  .superRefine((value, ctx) => {
    if (value.category === "su") {
      if (!value.brand) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Su ürününde marka zorunlu",
          path: ["brand"],
        });
      }
      if (value.volumeLiters == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Su ürününde hacim (litre) zorunlu",
          path: ["volumeLiters"],
        });
      }
    }
    if (value.category === "tup") {
      if (!value.sizeLabel) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Tüp ürün kartında boyut/etiket zorunlu",
          path: ["sizeLabel"],
        });
      }
      if (
        value.description &&
        TUP_DESCRIPTION_BLOCKLIST.test(value.description)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Tüp açıklamasında kurulum veya tehlikeli yönlendirme olamaz",
          path: ["description"],
        });
      }
    }
    if (value.requiresEmptyReturn === false && value.depositKurus > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Boş kap iadesi yoksa depozito 0 olmalıdır",
        path: ["depositKurus"],
      });
    }
  });

export type UpsertCatalogProductInput = z.infer<
  typeof upsertCatalogProductSchema
>;

export const catalogCartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(50),
});

export const placeProductOrderSchema = z.object({
  businessId: z.string().uuid(),
  addressId: z.string().uuid(),
  category: catalogCategorySchema,
  paymentMethod: doorPaymentMethodSchema,
  items: z.array(catalogCartItemSchema).min(1),
  customerNote: z.string().trim().max(500).optional(),
});

export type PlaceProductOrderInput = z.infer<typeof placeProductOrderSchema>;

export type CatalogProductCard = {
  id: string;
  businessId: string;
  tradeName: string;
  category: CatalogCategory;
  name: string;
  brand: string | null;
  volumeLiters: number | null;
  sizeLabel: string | null;
  unitPriceKurus: number;
  depositKurus: number;
  requiresEmptyReturn: boolean;
  description: string | null;
  quantityAvailable: number;
};

export function availableStock(
  onHand: number,
  reserved: number,
): number {
  return Math.max(0, onHand - reserved);
}

export function orderPayableKurus(order: {
  subtotalKurus: number;
  depositKurusTotal: number;
}): number {
  return order.subtotalKurus + order.depositKurusTotal;
}

export const catalogRpcErrors: Record<string, string> = {
  CATALOG_REGION_CLOSED:
    "Bu bölgede seçilen kategori için hizmet açık değil.",
  CATALOG_AUTH_REQUIRED: "Giriş yapmanız gerekiyor.",
  CATALOG_FORBIDDEN: "Bu işlem için yetkiniz yok.",
  CATALOG_BUSINESS_NOT_FOUND: "İşletme bulunamadı.",
  CATALOG_BUSINESS_NOT_ELIGIBLE:
    "İşletme bu kategoride onaylı ve aktif değil.",
  CATALOG_OUT_OF_AREA: "İşletme bu bölgede hizmet vermiyor.",
  CATALOG_PRODUCT_NOT_FOUND: "Ürün bulunamadı veya aktif değil.",
  CATALOG_STOCK_NOT_FOUND: "Stok kaydı bulunamadı.",
  CATALOG_INVALID_STOCK: "Geçersiz stok miktarı.",
  CATALOG_STOCK_BELOW_RESERVED:
    "Stok, rezerve edilen miktarın altına inemez.",
  CATALOG_EMPTY_CART: "Sepet boş.",
  CATALOG_ADDRESS_INVALID: "Adres geçersiz.",
  CATALOG_INVALID_QTY: "Geçersiz adet.",
  CATALOG_INSUFFICIENT_STOCK: "Yetersiz stok; sipariş alınamadı.",
  CATALOG_ORDER_NOT_FOUND: "Sipariş bulunamadı.",
  CATALOG_INVALID_STATE: "İşlem bu durumda yapılamaz.",
  CATALOG_INVALID_EMPTY_RETURN: "Boş kap adedi geçersiz.",
  CATALOG_EMPTY_RETURN_EXCEEDS:
    "İade edilen boş kap, beklenenden fazla olamaz.",
  CATALOG_STOCK_CONSUME_FAILED: "Stok düşümü başarısız.",
  TUP_NO_INSTALL_GUIDANCE:
    "Tüp ürün açıklamasında kurulum/tehlikeli yönlendirme olamaz.",
  SUBSCRIPTION_REQUIRED: "Aktif işletme aboneliği gerekli.",
};

export function mapCatalogErrorMessage(error: {
  message?: string;
}): string {
  const message = error.message ?? "";
  for (const [code, tr] of Object.entries(catalogRpcErrors)) {
    if (message.includes(code)) {
      return tr;
    }
  }
  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}
