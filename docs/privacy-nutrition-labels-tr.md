# Gizlilik besin / veri güvenliği etiketleri — Klimacın Kapıda

Kaynak kod: `packages/shared/src/privacy.ts` → `DATA_CATEGORIES`.  
Bu belge Apple App Privacy / Google Play Data safety formlarını doldurmak içindir.  
Avukat onayı yerine geçmez; gerçek şema ve akışlara dayanır.

**Genel**

- Tracking / ATT: **Hayır** (üçüncü taraf reklam kimliği yok).
- Kart PAN/CVC: **Bizde yok** (Stripe checkout oturumu; pan DB’de saklanmaz).
- Konum: **Yalnızca personel uygulaması**, atanmış işte `en_route` / `on_site` (ön plan).
- Müşteri uygulaması: konum izni **yok** (manuel TR adres).

---

## Apple — App Privacy (müşteri)

| Veri türü (Apple) | Linked to You | Used for Tracking | Amaç | Kaynak kategori |
| --- | --- | --- | --- | --- |
| Phone Number | Yes | No | App Functionality | account |
| Name | Yes | No | App Functionality | account |
| Physical Address | Yes | No | App Functionality | addresses |
| Product Interaction (sipariş/talep) | Yes | No | App Functionality | klima, catalog_orders |
| Customer Support (mesaj/sorun) | Yes | No | App Functionality | comms |
| Device ID (push token) | Yes | No | App Functionality | comms |
| Precise Location | **No** (müşteri) | — | — | — |
| Payment Info | No (kart bizde yok); kapıda ödeme yöntemi tercihi siparişte | No | App Functionality | catalog_orders |

**Personel ek:** Precise Location → Yes, Linked, Not tracking → App Functionality (staff_tracking). Sadece iş aktifken.

---

## Google Play — Data safety (müşteri)

| Veri türü | Toplanıyor | Paylaşılıyor | Ephemeral | Amaç |
| --- | --- | --- | --- | --- |
| Telefon numarası | Evet (SMS Auth) | Hayır* | Hayır | Hesap |
| Ad | Evet | Hayır* | Hayır | Hesap |
| Adres | Evet | İşletmeye sipariş için | Hayır | Teslimat |
| Uygulama etkileşimi | Evet | İşletmeye ilgili iş | Hayır | Sipariş/servis |
| Mesajlar | Evet | Karşı tarafa | Hayır | Destek |
| Cihaz veya diğer kimlikler (push) | Evet | Push sağlayıcıya | Hayır | Bildirim |
| Konum | **Hayır** (müşteri) | — | — | — |
| Finansal bilgi (kart) | **Hayır** | — | — | Kapıda nakit/POS |

\*İşletme paneli ilgili işletme sahiplerine sipariş/talep verisini gösterir (hizmet için gerekli); reklam ağına satış yok.

**Personel:** Konum ≈ yaklaşık/kesin, toplanır, yalnızca atanmış iş süresince; iş bitince “canlı” sayılmaz.

---

## Hesap silme (mağaza zorunluluğu)

1. Uygulama içi: Hesap → silme talebi (`request_account_deletion`).  
2. Web: `/hesap-silme` (oturum gerekir).  
3. Anında wipe yok: pending → admin inceleme → PII silme/anonimleştirme.  
4. URL (DNS sonrası): `https://klimacinkapida.com/hesap-silme`

Adımlar: `ACCOUNT_DELETION_STEPS_TR` in `privacy.ts`.

---

## Form doldurma kontrol listesi

- [ ] Müşteri: konum toplanmıyor  
- [ ] Personel: konum yalnızca iş sırasında, amaç “uygulama işlevi”  
- [ ] Tracking / reklam kimliği: yok  
- [ ] Kart verisi: toplanmıyor  
- [ ] Hesap silme URL + uygulama içi yol  
- [ ] Gizlilik URL: `/gizlilik`  
- [ ] İletişim: `destek@klimacinkapida.com` (DNS/posta kutusu kullanıcı)
