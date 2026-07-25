# MKS Çalışma Odası — Tasarım Dokümanı

**Tarih:** 25 Temmuz 2026
**Durum:** Kullanıcı onaylı tasarım (uygulama planı bekliyor)
**Hedef sınav:** MKS-4 — Turist Rehberliği Mesleğe Kabul Sınavı, 29 Ağustos 2026, saat 10:00

## 1. Amaç ve Kapsam

Türkiye'de turist rehberliği öğrencilerinin girdiği Mesleğe Kabul Sınavı (MKS) için
**tek kullanıcılık, premium, mobil öncelikli** bir sınav hazırlık web uygulaması.

- İlk kullanıcı: proje sahibinin kız arkadaşı; MKS-4'e (~5 hafta) hazırlanıyor.
- Üyelik/veritabanı YOK; ilerleme tarayıcıda (localStorage) tutulur, JSON olarak
  dışa/içe aktarılır. Veri şeması ileride Supabase eklenerek çok kullanıcıya
  açılabilecek şekilde tasarlanır.
- Erişim: ücretsiz statik hosting (Netlify/Vercel) üzerinden link ile; telefon +
  bilgisayar. PWA: ana ekrana eklenir, çevrimdışı çalışır.

## 2. Sınav Gerçekleri (araştırma ile doğrulandı)

- Düzenleyen: Kültür ve Turizm Bakanlığı adına Anadolu Üniversitesi (6326 sayılı
  Turist Rehberliği Meslek Kanunu kapsamında).
- Format: 100 çoktan seçmeli soru, 120 dakika, baraj 70/100. Yanlış doğruyu
  götürmez. Puan = (Doğru / Toplam) × 100.
- Oturumlar: MKS-1 (23 Şub 2025), MKS-2 (10 Ağu 2025), MKS-3 (14 Mar 2026),
  MKS-4 (29 Ağu 2026).
- Resmi konu başlıkları (12 blok):
  1. Genel Turizm Bilgisi, Turizm Mevzuatı, Turizm Sosyolojisi
  2. Türkiye'nin Tarihi ve Turizm Coğrafyası
  3. Genel Türk Tarihi ve Kültürü
  4. Osmanlı İmparatorluğu Tarihi
  5. Arkeoloji ve Mitoloji
  6. Roma, Yunan ve Bizans Tarihi
  7. Genel Sanat Tarihi
  8. Dinler Tarihi
  9. Genel Sağlık Bilgisi, İlk Yardım
  10. Anadolu Medeniyetleri Tarihi
  11. Türk Halk Bilimi, Türk Dili ve Edebiyatı
  12. Müzecilik (+ eser kaçakçılığı, UNESCO, koruma)
- Doğrulanacak: şık sayısı (4 veya 5) — çıkmış oturum derlemeleriyle teyit
  edilecek; otantik deneme formatı buna göre kurulacak.

## 3. Modüller

| Modül | Davranış |
|---|---|
| Ana Panel | Sınava geri sayım; günün görevleri (sprint planından); konu bazlı ilerleme halkaları; çalışma serisi (streak); "kaldığın yerden devam" |
| Konu Anlatımları | 12 konu × 3 katman: (a) tam anlatım, (b) sınav öncesi kısa anlatım, (c) "Tuzaklar & Trickler" — karıştırılan kavramlar, çeldirici mantığı. Her konu sonunda mini test bağlantısı |
| Soru Bankası | Konu/alt konu/zorluk filtreli; her soruda şık şık açıklama (neden doğru + neden yanlış); işaretleme (favori / emin değildim) |
| Çıkmış Sorular | MKS-1/2/3 oturumlarının kamuya açık derlemeleri + kullanıcının getireceği materyallerden aktarım; oturum bazında çözülür |
| Deneme Sınavı | 100 soru / 120 dk gerçek simülasyon; süre çubuğu; soru haritası; bitince konu bazlı kırılım, 70 barajına uzaklık, yanlış çözümleri |
| Akıllı Tekrar (SRS) | Flashcard'lar + hafif aralıklı tekrar algoritması (Leitner kutuları); yanlış yapılan her soru otomatik karta dönüşür |
| Yanlış Havuzu | Tüm yanlışlar tek yerde; tekrar çözme; üst üste 2 doğru çözülünce havuzdan çıkar |
| İstatistikler | Konu bazlı doğruluk; deneme puanı grafiği; zaman içinde gelişim; tahmini sınav puanı |
| Sprint Planı | 29 Ağustos'a kadar gün gün hazır program (konu + soru hedefi + tekrar); günler işaretlenir; geri sayımla senkron |
| Ayarlar / Veri | Koyu/açık tema; ilerleme dışa/içe aktarma (JSON dosyası) |

## 4. İçerik Planı

- **v1 hedefi:** her konudan ~40 açıklamalı soru (~500 soru); her konu için tam
  anlatım + kısa anlatım + tuzak listesi; ~300 flashcard; 1 tam deneme (100 soru,
  resmi konu ağırlıklarına yakın dağılım).
- **Genişletme turları:** konu konu soru artırımı; ek denemeler; kamuya açık
  çıkmış soru derlemelerinin (örn. 23 Şubat 2025 seti) "Çıkmış Sorular" bölümüne
  işlenmesi.
- **Kullanıcı materyali hattı:** `icerik-gelen-kutusu/` klasörüne atılan PDF/not
  dosyaları JSON'a dönüştürülüp içerik paketlerine işlenir.
- İçerik üretimi: Claude tarafından, resmi konu listesi ve sınav formatı esas
  alınarak; her soru tek doğru şık + tüm şıklar için açıklama içerir.
- Telif notu: site kişisel kullanımda kaldığı sürece kopyalanan/derlenen çıkmış
  soru içeriği sorun değildir; herkese açılması durumunda bu bölüm yeniden
  değerlendirilecek.

## 5. Teknik Mimari

- **Vite + React + TypeScript** SPA; tamamen statik build.
- İçerik, uygulama kodundan ayrı JSON paketlerinde:
  - `content/topics/<slug>.json` — anlatım katmanları, tuzaklar, flashcard'lar
  - `content/questions/<slug>.json` — soru bankası (konu başına dosya)
  - `content/exams/<id>.json` — denemeler ve çıkmış oturum derlemeleri
- İlerleme durumu: localStorage; tek köşe taşı anahtar altında sürümlü şema
  (attempts, srsState, examResults, planProgress, settings). Dışa/içe aktarma
  aynı şemanın JSON dosyası.
- **PWA:** vite-plugin-pwa ile manifest + service worker; içerik önbelleğe
  alınır, uygulama çevrimdışı tam çalışır.
- Deploy: Netlify veya Vercel ücretsiz katman (deploy aşamasında kullanıcıdan
  hesap istenecek).
- İleriye dönük: veri erişimi tek bir depo modülü arkasında toplanır; Supabase
  eklendiğinde localStorage yerine uzak depo geçirilebilir.

## 6. Kalite ve Test

- **İçerik doğrulayıcı script:** her sorunun tam olarak bir doğru şıkkı, tüm
  şıklarda açıklaması, geçerli konu etiketi ve benzersiz id'si olduğunu; deneme
  dosyalarının tam 100 soru içerdiğini derleme sırasında doğrular (CI görevi /
  npm script).
- **Birim testleri (Vitest):** puanlama, SRS kutu geçişleri, yanlış havuzu
  kuralları, süre/zamanlayıcı, localStorage şema göçleri, dışa/içe aktarma.
- **Duman testi (Playwright):** ana akışlar — soru çözme, deneme başlatma/bitirme,
  ilerlemenin kalıcılığı.

## 7. Tasarım Dili

- Anadolu kimliğinden beslenen palet: terracotta, derin lacivert, altın vurgu;
  koyu/açık tema.
- Özenli Türkçe tipografi (tam Türkçe glif desteği olan display + metin fontu).
- Yumuşak mikro animasyonlar: doğru cevapta zarif geri bildirim, ilerleme
  halkası dolumları, sayfa geçişleri.
- Telefonda alt sekme navigasyonu ile gerçek uygulama hissi; masaüstünde yan
  panel düzeni.
- Uygulama aşamasında `frontend-design` ve `ui-ux-pro-max` skill'leri ile
  detaylandırılır.

## 8. Kapsam Dışı (v1)

- Üyelik, ödeme, çok kullanıcı, sunucu tarafı — yok.
- SEO/pazarlama — yok (site link ile erişilen kişisel kullanım).
- Yabancı dil sınavı içeriği — MKS yazılı sınavı yalnızca Türkçe genel
  konulardan oluşur; dil hazırlığı kapsam dışı.
