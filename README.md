# Klimacın Kapıda

Klima servisi, su ve tüp. Tek uygulamayla kapında.

Türkiye’de şehir/ilçe bazında klima bakım/onarım/montaj, damacana su ve tüp siparişini müşterilerle buluşturan yerel hizmet platformu.

> Hedef alan adı: `klimacinkapida.com` — bu repoda DNS/yayın yapılmaz.

## Monorepo

| Yol | Açıklama |
| --- | --- |
| `apps/customer` | Müşteri mobil (Expo development build) |
| `apps/staff` | Saha personeli mobil (ayrı giriş; müşteriye gereksiz BG konum yok) |
| `apps/business-web` | İşletme paneli (Next.js) |
| `apps/admin-web` | Platform yönetim paneli (Next.js) |
| `packages/config` | Merkezi marka + tasarım tokenları |
| `packages/shared` | Roller, adres, başvuru şemaları, para/zaman yardımcıları |
| `packages/ui` | Web tasarım sistemi |
| `packages/ui-native` | React Native tasarım sistemi (**ayrı paket**; `@klimacin/ui/native` subpath yok) |
| `supabase/` | Postgres şema / RLS başlangıcı |

## Marka

Tüm yüzeyler `@klimacin/config` üzerinden okur:

- Ad: **Klimacın Kapıda**
- Slogan: Klima servisi, su ve tüp. Tek uygulamayla kapında.
- Ana ekranda Klima / Su / Tüp eşit görünürlük

## Geliştirme

```bash
pnpm install
pnpm typecheck
pnpm --filter @klimacin/config test
pnpm --filter @klimacin/shared test
pnpm --filter @klimacin/business-web dev
pnpm --filter @klimacin/admin-web dev
pnpm --filter @klimacin/customer start
pnpm --filter @klimacin/staff start
```

Ortam şablonu: [`.env.example`](./.env.example). Gizli anahtarları sohbete yapıştırmayın.

## Supabase

Migrations:

- `20260322000100_init_accounts_roles_addresses.sql` — hesaplar, roller, adresler, başvuru
- `20260322000200_klima_request_offer_appointment.sql` — klima talep/teklif/randevu/ek iş + RPC
- `20260322000300_su_tup_catalog_orders.sql` — su/tüp katalog, stok, depozito/boş kap, sipariş + RPC
- `20260322000400_staff_assignment_live_tracking.sql` — personel atama + canlı konum

Klima RPC özeti: `publish_klima_request`, `submit_klima_offer`, `accept_klima_offer` (geçici hold), `confirm_klima_appointment`, `decide_klima_extra_work`, `complete_klima_appointment` (bekleyen ek iş varsa reddeder).

Su/Tüp RPC özeti: `upsert_catalog_product`, `adjust_product_stock`, `place_product_order` (atomik rezervasyon; fiyat DB’den), `accept_product_order`, `cancel_product_order`, `deliver_product_order` (stok düşümü + boş kap / depozito iadesi).

Personel RPC özeti: `invite_staff_member`, `assign_staff_to_klima_appointment` / `assign_staff_to_product_order` (çifte aktif atama yok), `staff_update_assignment_status`, `staff_post_location` (yalnızca en_route/on_site), `staff_complete_assignment` (kod), `get_assignment_tracking` (`is_live` ≤ 90 sn; eski ping canlı değil; sahte ETA yok).

- RLS açık; işletme `is_active` için onaylı kategori zorunlu
- SMS Auth / proje bağlantısı dış bağımlılık — bağlanmadan “tamamlandı” sayılmaz

## Kurallar (özet)

- Demo/mock işletme, sahte fiyat, auth bypass yok
- Tutarlar kuruş (integer); DB saatleri UTC; gösterim `Europe/Istanbul`
- Expo Go teslim ölçütü değil — development build hedeflenir
