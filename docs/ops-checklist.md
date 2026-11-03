# Klimacın Kapıda — Ops / yayın kontrol listesi

Bu liste **hazırlık** içindir. DNS değiştirme, canlı billing modu veya genel mağaza yayını bu repoda yapılmaz. Cihaz yoksa cihaz E2E “geçti” sayılmaz.

## Kimlikler

| Yüzey | iOS bundle / Android package | Scheme |
| --- | --- | --- |
| Müşteri | `com.klimacinkapida.customer` | `klimacinkapida` |
| Personel | `com.klimacinkapida.staff` | `klimacinkapida-staff` |

EAS: `apps/customer/eas.json`, `apps/staff/eas.json` — profiller `development` / `preview` / `production`. `extra.eas.projectId` ve `owner` EAS init sonrası doldurulur (`REPLACE_AFTER_EAS_INIT`).

## Ortam

### Bu proje (URL only — anahtarları sohbete yapıştırma)

- Project URL: `https://trqdqohhqtdeznkhminh.supabase.co`
- project-ref: `trqdqohhqtdeznkhminh`
- [ ] Dashboard → Settings → API: `anon` + `service_role` → **yalnızca lokal** `.env.local` / `apps/customer/.env` / `apps/staff/.env` (şablon: `.env.example`)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL` = yukarıdaki URL
- [ ] `npx supabase link --project-ref trqdqohhqtdeznkhminh` ardından `npx supabase db push` (migrations `00100`…`00900`)
- [ ] Alternatif: SQL Editor’da migration dosyalarını artan sırada çalıştır
- [ ] Authentication → Providers → Phone enable + SMS sağlayıcı
- [ ] `ADMIN_BOOTSTRAP_SECRET` (≥16) + service role — admin-web `/bootstrap` (açık kayıt yok)
- [ ] Private bucket `job-attachments` (migration 009; public=false)
- [ ] Smoke: business `/hesap` OTP UI; `select count(*) from subscription_plans;`
- [ ] Push: `EXPO_ACCESS_TOKEN` (+ cihaz token); yoksa `skipped_no_provider`
- [ ] Billing: `STRIPE_SECRET_KEY` + `PAYMENT_WEBHOOK_SECRET`; yoksa `blocked_no_provider` — sahte `succeeded` yok
- [ ] Canlı Stripe modu kullanıcı onayı olmadan açılmaz

## Derleme (cihaz)

- [ ] `eas build --profile development` müşteri + personel (Expo Go teslim değil)
- [ ] İkon / splash nihai marka görselleri (şu an placeholder asset’ler)
- [ ] İzin metinleri mağaza dilinde gözden geçir
- [ ] Custom scheme smoke: `klimacinkapida://`, `klimacinkapida-staff://gorev/{uuid}`
- [ ] Universal links: DNS + AASA + Digital Asset Links — **DNS bu görevde yok**

## Mağaza / hukuk

- [ ] Gizlilik URL (geçici: işletme paneli `/gizlilik`; prod domain sonra)
- [ ] Hesap silme URL `/hesap-silme` + App Store “delete account” gereksinimi
- [ ] KVKK aydınlatma / çerez (web) — hukuk incelemesi
- [ ] Play Data safety / Apple privacy nutrition labels (kategoriler `packages/shared/src/privacy.ts`)
- [ ] Hesap silme ops: açık talep → admin `processing` → PII wipe → `auth.users` delete → `completed` (otomatik fake completed yok)

## İzleme (prod proje sonrası)

- [ ] PITR / yedekleme
- [ ] Webhook replay + idempotency metrikleri
- [ ] Abonelik `past_due` alarmı
- [ ] RLS advisor
- [ ] Push `skipped_no_provider` oranı

## Bilinçli dışarıda bırakılanlar

- DNS / SSL / alan adı bağlama
- Genel mağaza yayını (`eas submit` production public)
- Canlı ödeme modu
- Cihaz E2E yeşil iddiası (cihaz yoksa)
