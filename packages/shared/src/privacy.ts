/**
 * Privacy + account-deletion copy aligned to real schema tables / flows.
 * Legal text is operational honesty for store review — not a lawyer substitute.
 */

export const DATA_CATEGORIES = [
  {
    id: "account",
    titleTr: "Hesap",
    tables: ["profiles", "profile_roles", "auth.users (Supabase Auth)"],
    fieldsTr: "Telefon (SMS Auth), ad soyad, roller",
  },
  {
    id: "addresses",
    titleTr: "Adresler",
    tables: ["customer_addresses"],
    fieldsTr: "İl/ilçe, satır, isteğe bağlı GPS koordinatı",
  },
  {
    id: "business",
    titleTr: "İşletme",
    tables: [
      "businesses",
      "business_applications",
      "business_category_approvals",
      "staff_memberships",
    ],
    fieldsTr: "Unvan, vergi no, iletişim, kategori onayları, personel davetleri",
  },
  {
    id: "klima",
    titleTr: "Klima işleri",
    tables: [
      "klima_requests",
      "klima_offers",
      "klima_appointments",
      "klima_extra_work_items",
    ],
    fieldsTr: "Talep, teklif, randevu, ek iş onayları",
  },
  {
    id: "catalog_orders",
    titleTr: "Su / tüp siparişleri",
    tables: ["catalog_products", "product_orders", "product_order_items"],
    fieldsTr: "Ürün/stok (işletme), sipariş kalemleri, depozito/boş kap",
  },
  {
    id: "staff_tracking",
    titleTr: "Personel takip",
    tables: ["job_assignments", "staff_location_pings"],
    fieldsTr:
      "Atama durumları, yalnızca en_route/on_site konum ping’leri (iş bitince kesilir)",
  },
  {
    id: "comms",
    titleTr: "İletişim",
    tables: [
      "device_push_tokens",
      "notifications",
      "push_delivery_attempts",
      "message_threads",
      "thread_messages",
      "issues",
    ],
    fieldsTr: "Push token, bildirim, mesaj, sorun kayıtları",
  },
  {
    id: "billing",
    titleTr: "İşletme aboneliği",
    tables: [
      "subscription_plans",
      "business_subscriptions",
      "subscription_checkout_sessions",
      "billing_events",
    ],
    fieldsTr:
      "Plan/durum, checkout oturumu, sağlayıcı olay kimliği — kart pan/cvc kendi DB’mizde yok",
  },
] as const;

export const accountDeletionStatuses = [
  "pending",
  "processing",
  "completed",
  "rejected",
  "cancelled",
] as const;
export type AccountDeletionStatus = (typeof accountDeletionStatuses)[number];

export const accountDeletionStatusLabelsTr: Record<
  AccountDeletionStatus,
  string
> = {
  pending: "Beklemede",
  processing: "İşleniyor",
  completed: "Tamamlandı",
  rejected: "Reddedildi",
  cancelled: "İptal",
};

export type AccountDeletionRequest = {
  id: string;
  profileId: string;
  status: AccountDeletionStatus;
  reason: string | null;
  requestedAt: string;
  processedAt: string | null;
};

/**
 * What deletion does when ops/admin completes it — documented for store pages.
 * Immediate RPC only queues a request + deactivates push; it does not fake wipe.
 */
export const ACCOUNT_DELETION_STEPS_TR = [
  "Kullanıcı uygulamadan veya /hesap-silme sayfasından silme talebi oluşturur (oturum gerekir).",
  "Push token’lar pasifleştirilir; yeni ticari işlemler engellenir (talep pending).",
  "Platform admin talebi inceler; açık sipariş/randevu ve işletme sahipliği kontrol edilir.",
  "Onay sonrası PII silinir veya anonimleştirilir; auth.users silinir (Supabase).",
  "Yasal saklama zorunluluğu olan fatura/abonelik olay kimlikleri sağlayıcıda kalabilir — kart verisi bizde yoktur.",
] as const;

export const PRIVACY_CONTACT_PLACEHOLDER =
  "destek@klimacinkapida.com (DNS/posta kutusu henüz bağlı olmayabilir)";
