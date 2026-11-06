# Mağaza listeleme metinleri (TR) — Klimacın Kapıda

Domain hedef: `klimacinkapida.com` (DNS/yayın kullanıcı onayı olmadan yapılmaz).  
Kimlikler: `com.klimacinkapida.customer` · `com.klimacinkapida.staff` · sürüm `1.0.0`.

---

## Müşteri uygulaması

**Ad:** Klimacın Kapıda  
**Slogan:** Klima servisi, su ve tüp. Tek uygulamayla kapında.

### Kısa açıklama (≤80 karakter önerisi)

```
Klima servisi, damacana su ve tüp — tek uygulamayla kapında.
```

### Uzun açıklama

```
Klimacın Kapıda; klima bakım/montaj/arıza, damacana su ve tüp siparişini aynı
uygulamada birleştirir.

• Klima: talep oluşturun, işletme tekliflerini fiyat / süre / puan / tamamlanan
  işe göre karşılaştırın, geçici rezervasyonu onaylayın.
• Su ve tüp: stoklu ürünlerden sipariş verin; ödeme kapıda nakit veya POS.
• Adres: Türkiye il/ilçe ile manuel giriş (harita anahtarı yoksa GPS zorunlu değil).
• Bildirim ve mesaj: sipariş/randevu durumu sunucudan; sahte başarı yok.
• Hesap silme: uygulamadan talep; anında silme vaadi yok — inceleme sonrası.

Platform, müşteri sipariş bedelini tahsil etmiş gibi göstermez. Kart bilgisi
uygulama veritabanında tutulmaz.
```

### Anahtar kelimeler (App Store)

```
klima,su,tüp,damacana,servis,montaj,kapıda,teslimat,bakım
```

### Kategori

- iOS: Yaşam Tarzı / Yardımcı Programlar  
- Android: Alışveriş / Ev ve bahçe

### Destek / politika URL’leri (DNS sonrası)

| Amaç | URL |
| --- | --- |
| Destek | `https://klimacinkapida.com` (veya destek@…) |
| Gizlilik | `https://klimacinkapida.com/gizlilik` |
| Hesap silme | `https://klimacinkapida.com/hesap-silme` |

Uygulama içi: Hesap sekmesi + `klimacinkapida://gizlilik` / `…://hesap-silme`.

### Ekran görüntüsü çekim listesi

1. Ana: marka + Klima / Su / Tüp eşit üç hizmet  
2. Klima teklif karşılaştırma (gerçek veya boş dürüst durum)  
3. Su/tüpp katalog + sepet özeti  
4. Siparişler listesi + puan  
5. Hesap: adres + silme talebi  

Cihaz yoksa: web panellerinden (`business-web` `/gizlilik`, `/hesap-silme`) ve Expo web önizlemesinden kare alın; native store shot’lar cihaz/EAS sonrası.

---

## Personel uygulaması

**Ad:** Klimacın Kapıda Personel

### Kısa açıklama

```
Atanan klima / su / tüp işleri, durum ve güvenli konum paylaşımı.
```

### Uzun açıklama

```
Sahadaki personel için Klimacın Kapıda Personel:

• Yalnızca size atanan işler (açık kayıt yok; davet ile üyelik).
• Durum güncelleme ve tamamlanma kodu.
• Konum yalnızca yolda/sahadayken; iş bitince paylaşım kesilir.
• Hesap silme talebi uygulamadan.

Müşteri uygulamasından ayrı paket: com.klimacinkapida.staff
```

### Destek / politika

Aynı gizlilik ve hesap-silme URL’leri. Davet: `klimacinkapida-staff://davet/{token}`.

### Ekran görüntüsü listesi

1. Giriş / SMS OTP (veya env yoksa dürüst boş durum)  
2. Görev listesi  
3. Atama detay + konum izni metni  
4. Hesap / silme talebi  

---

## EAS / gönderim notları

```bash
cd apps/customer && eas build --profile production --platform all
cd apps/staff && eas build --profile production --platform all
```

`extra.eas.projectId`, `owner`, `ascAppId` → kullanıcı EAS / App Store Connect sonrası.  
Play: internal track draft; canlı ücret / public domain onayı ayrı.
