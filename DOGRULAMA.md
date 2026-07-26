# Doğrulama Raporu — PASS

**Tarih:** 27 Temmuz 2026
**Sürüm:** `65bcfa1`
**Yöntem:** Playwright ile canlı Supabase veritabanına karşı uçtan uca test
**Hesap:** `duygu` (test verisi sonradan temizlendi)

---

## Sonuç: PASS

İlerleme hesaba kaydediliyor ve cihazlar arasında taşınıyor. Aşağıdaki
kontrollerin hepsi geçti; hiçbiri "muhtemelen çalışır" değil, hepsi gerçek
veritabanına yazılıp geri okunarak doğrulandı.

---

## 1. Sekmeler — 16/16 açıldı

Her rota gezildi, `<main>` içeriği ve `<h1>` başlığı okundu, hata sınırının
devreye girip girmediğine bakıldı. JavaScript hatası: **0**.

| Rota | Başlık | Durum |
|---|---|---|
| `/` | İyi geceler | ✅ |
| `/konular` | Konular | ✅ |
| `/konular/osmanli-tarihi` | Osmanlı İmparatorluğu Tarihi | ✅ |
| `/soru-bankasi` | Soru Bankası | ✅ |
| `/pratik` | *(soru ekranı)* | ✅ |
| `/cozduklerim` | Çözdüklerim | ✅ |
| `/kendi-sorularim` | Soru Yükle | ✅ |
| `/soru-aileleri` | Sorularla Öğreniyorum | ✅ |
| `/gunluk-denemeler` | Günün Denemeleri | ✅ |
| `/ai-hoca` | AI Hoca | ✅ |
| `/denemeler` | Denemeler & Çıkmış Sorular | ✅ |
| `/tekrar` | Akıllı Tekrar | ✅ |
| `/yanlis-havuzu` | Yanlış Havuzu | ✅ |
| `/istatistik` | İstatistik | ✅ |
| `/plan` | Çalışma Planı | ✅ |
| `/ayarlar` | Ayarlar | ✅ |

## 2. Yazma — her tablo yerelle birebir

Arayüzden gerçek eylemler yapıldı: soru çözüldü, soru işaretlendi, plan
hedefi tamamlandı, 20 soruluk mini deneme baştan sona çözülüp teslim edildi,
tema ve geri sayım tercihi değiştirildi. Ardından sunucu doğrudan okundu.

| Tablo | Yerel | Sunucu |
|---|---|---|
| `attempts` | 7 | 7 |
| `wrong_pool` | 3 | 3 |
| `flagged` | `ilk-yardim-011` | `ilk-yardim-011` |
| `srs_cards` | 18 | 18 |
| `exam_results` | `mini-ilk-yardim-0` / 25 puan | `mini-ilk-yardim-0` / 25 puan |
| `plan_progress` | `gun-2026-07-27:0` | `gun-2026-07-27:0` |
| `streak` | 2026-07-27 / 1 / 1 | 2026-07-27 / 1 / 1 |
| `settings` | light + full | light + full |

## 3. Cihaz değişimi — asıl test

`localStorage` **tamamen silindi**, sayfa yeniden yüklendi, giriş yapıldı.
Bu, telefondan girmenin birebir karşılığı.

| Veri | Silmeden önce | Girişten sonra |
|---|---|---|
| Denemeler | 7 | 7 |
| Tekrar kartları | 18 | 18 |
| Yanlış havuzu | 18 | 18 |
| İşaretli sorular | 1 | 1 |
| Deneme sonucu | mini-ilk-yardim-0 / 25 | mini-ilk-yardim-0 / 25 |
| Plan hedefi | 1 | 1 |
| Seri | 1 gün | 1 gün |

Kayıp: **yok**.

## 4. Silme yayılıyor

Soru işareti arayüzden kaldırıldı → sunucudaki satır da silindi.
Yerel `[]`, sunucu `[]`.

## 5. Ağ kesintisi — veri kaybı yok

Supabase istekleri kasıtlı olarak düşürüldü, sonra geri açıldı.

| | Ağ kapalıyken | Ağ geldikten sonra |
|---|---|---|
| Uygulama | çalışmaya devam etti | çalışıyor |
| Hata ekranı | çıkmadı | — |
| Rozet | "Kaydedilemedi" | "İlerlemen kayıtlı" |
| Yerel deneme | 10 | 11 |
| Sunucu deneme | — | 11 |

Çevrimdışıyken çözülen sorular bağlantı gelince gönderildi.

## 6. Oturum akışı

- Giriş → kapı açılıyor ✅
- Çıkış → giriş ekranı geri geliyor ✅
- "Girmeden devam et" → uygulama sorunsuz çalışıyor, ilerleme yerelde kalıyor ✅
- Ayarlar → "Giriş yap veya hesap aç" → giriş ekranına dönüyor ✅

> Bu son madde bir hata düzeltmesiydi: atlama bayrağı başarılı girişte de
> yazılıyordu, bu yüzden çıkış yapan kullanıcı giriş ekranına bir daha
> dönemiyordu.

## 7. Yapı ve testler

- `npm run build` → başarılı
- `npx vitest run` → **92 test, 13 dosya, hepsi geçti** (14'ü yeni senkron testi)
- `tsc --noEmit` → temiz

---

## Kapsam dışı

- **Aynı anda iki cihaz.** İki cihaz aynı saniyede yazarsa birleştirme
  kuralları devreye girer (sayaçta yüksek olan, kartta ileri kutu). Tek
  kullanıcı için gerçekçi bir senaryo değil; test edilmedi.
- **AI Hoca yanıt kalitesi.** Sekmenin açıldığı doğrulandı, üretilen metnin
  doğruluğu bu raporun konusu değil.
