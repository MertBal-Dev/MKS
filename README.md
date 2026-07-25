# MKS Çalışma Odası

Turist Rehberliği **Mesleğe Kabul Sınavı (MKS)** için kişisel, premium, çevrimdışı çalışan hazırlık uygulaması.
Hedef: **MKS-4 — 29 Ağustos 2026, 10.00**.

## İçinde ne var?

- **300 GERÇEK çıkmış soru** — üç oturumun tamamı, cevap anahtarlarıyla:
  - 23 Şubat 2025 (MKS-1) — 100 soru, 4 şıklı
  - 10 Ağustos 2025 (MKS-2) — 100 soru, 4 şıklı
  - **14 Mart 2026 (MKS-3) — 100 soru, 5 şıklı** ← sınav bu oturumda 5 şıka geçti, MKS-4 için en güncel örnek
- **480 özgün soru** — her şık için "neden doğru / neden yanlış" açıklamalı
- **12 resmi konu** için 3 katmanlı anlatım: tam anlatım • sınav sabahı kısa anlatımı • **Tuzaklar & Trickler**
- **Günün Denemesi** — her güne özel, o gün herkeste aynı olan 50 soruluk set (60 dk)
- **100 soruluk tam deneme** — gerçek format: 120 dk, soru haritası, otomatik teslim, konu kırılımı
- **AI Hoca** — her sorunun altında Vertex AI (Gemini) ile derinlemesine çözüm + **türev sorular** + takip sohbeti;
  ayrı bir sayfadan serbest soru da sorulabilir (sınav sırasında bilinçli olarak kapalı)
- **Çözdüklerim** — çözülen her soru, verilen cevapla birlikte geri dönülebilir arşivde
- **Akıllı Tekrar** — Leitner kutu sistemli kartlar; yanlış yapılan her soru otomatik karta dönüşür
- **Yanlış Havuzu** — üst üste 2 doğruyla havuzdan çıkış
- **İstatistik** — konu doğruluğu, deneme grafiği, tahmini sınav puanı
- **Çalışma Planı** — 29 Ağustos'a gün gün program (temel → pekiştirme → son düzlük)
- **PWA** — telefonda ana ekrana eklenir, internetsiz çalışır (AI Hoca hariç)

### Sınavın resmi konu dağılımı (uygulamadaki ağırlıklar buna göre)

| Başlık | Soru | Başlık | Soru |
|---|---|---|---|
| Genel Turizm Bilgisi, Mevzuat | 15 | İletişim Becerileri ve Etik | 5 |
| Türkiye'nin Tarihi ve Coğrafyası | 13 | Türkiye'nin Flora ve Faunası | 5 |
| Anadolu Medeniyetleri Tarihi | 12 | Genel Sağlık ve İlk Yardım | 5 |
| Roma, Yunan ve Bizans Tarihi | 8 | Müzecilik ve Suçlar | 5 |
| Genel Türk Tarihi ve Kültürü | 6 | Osmanlı İmparatorluğu Tarihi | 4 |
| Arkeoloji ve Mitoloji | 6 | Dinler Tarihi | 4 |
| Genel Sanat Tarihi | 6 | **Toplam** | **100** |
| Türk Halk Bilimi ve Edebiyatı | 6 | | |

## İçerik kaynakları

- **Çıkmış sınavlar:** [trkutuphane.com ücretsiz test arşivi](https://www.trkutuphane.com/mks-deneme-sinavlari)
  — Şubat 2025, Ağustos 2025 ve Mart 2026 oturumları (`scripts/fetch-trk.mjs` ile indirildi).
- **Resmi sınav bilgileri:** [ktb.gov.tr duyuruları](https://www.ktb.gov.tr) ve
  [Anadolu Üniversitesi sınav hizmetleri](https://www.anadolu.edu.tr).
- **Soru bankası, konu anlatımları ve kartlar:** bu proje için özgün olarak hazırlandı.

## Çalıştırma (geliştirici)

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # birim testleri
npm run validate:content  # içerik doğrulayıcı
npm run build          # üretim derlemesi (dist/)
```

## Telefona kurulum (kullanıcı)

1. Siteyi telefonda aç (yayınlanan link veya `npm run dev` + aynı Wi-Fi'de `http://<bilgisayar-ip>:5173`).
2. **iPhone:** Paylaş → *Ana Ekrana Ekle*. **Android:** Menü → *Uygulamayı yükle*.
3. Artık uygulama gibi açılır; içerik çevrimdışı da çalışır.

## Veri nerede duruyor? (Supabase gerekli mi?)

İlerleme **tarayıcıda (localStorage)** tutulur: sunucu yok, hesap yok, internet olmadan da çalışır, gecikme sıfır.
Tek kullanıcı için bu yapı yeterlidir; Supabase eklemek hesap/oturum/çevrimdışı senkron karmaşası getirir ve
sınava az kala kırılganlık yaratır.

İki gerçek risk şöyle karşılanıyor:
1. **Veri kaybı:** Uygulama, 25+ soru çözülmüşse ve son yedekten 7 gün geçmişse otomatik olarak yedek almayı hatırlatır.
   **Ayarlar → Verini indir** ile tek dosyalık JSON yedeği alınır.
2. **Cihaz değiştirme:** Aynı JSON, diğer cihazda **Yedekten yükle** ile içeri aktarılır.

İki cihazda paralel ve sık çalışma ihtiyacı doğarsa Supabase senkronu sonradan eklenebilir:
`src/lib/storage.ts` tek veri kapısıdır, uzak depo oraya takılır — uygulamanın geri kalanı değişmez.

## AI Hoca nasıl kurgulandı?

- **Soru bağlamlı panel:** Pratik, çıkmış sorular, sınav sonucu, Çözdüklerim ve Yanlış Havuzu'ndaki
  her sorunun altındaki düğme sağdan bir panel açar; önce yapılandırılmış çözüm (neden doğru → çeldiriciler →
  ezber kancası → **türev sorular** → bağlantılı olgular), sonra istediğin kadar takip sorusu.
- **Serbest sohbet:** `/ai-hoca` sayfasından soru bağlamı olmadan da sorulabilir.
- **Sınavda kapalı:** Deneme sırasında AI görünmez — simülasyonun gerçekliği için. Teslimden sonra
  sonuç ekranındaki her soruda yeniden açılır.
- **Doğruluk:** Sistem talimatı, emin olunmayan tarih/isim/sayının hiç yazılmamasını ve şüpheli türev
  sorusunun listelenmemesini şart koşar ("az ama kesin > çok ama şüpheli").
- **Önbellek:** Bir sorunun ilk çözümü oturum içinde saklanır; tekrar açılınca anında gelir.

## Yayınlama (Vercel — ücretsiz)

1. [vercel.com](https://vercel.com)'da ücretsiz hesap aç.
2. Terminalde: `npx vercel login` → proje klasöründe `npx vercel` (ilk kurulum; soruları Enter'la geç)
   → `npx vercel --prod`.
3. **AI Hoca için** Vercel panelinde *Project → Settings → Environment Variables* bölümüne
   `.env.example` içindeki üç değişkeni ekle (değerler yereldeki `.env.local` dosyasında) ve
   yeniden deploy et (`npx vercel --prod`).
4. `vercel.json` hazır: SPA yönlendirmesi ayarlı; `api/ai-hoca.ts` otomatik olarak
   `/api/ai-hoca` fonksiyonuna dönüşür. (Netlify tercih edilirse `netlify.toml` da duruyor.)

## İçerik ekleme

- Yeni PDF/notları `icerik-gelen-kutusu/` klasörüne at → bir sonraki Claude oturumunda içeriğe işlenir.
- İçerik dosyaları `src/content/` altındadır; her değişiklikten sonra `npm run validate:content` çalıştır.

## Önemli not

Sorulardaki bilgiler ders kitabı düzeyinde doğrulanmış olsa da uygulama **kişisel çalışma** amaçlıdır;
resmi sınav içeriğini temsil etmez. Çıkmış sorular aday derlemelerinden aktarılmıştır.
Site yalnızca kişisel kullanım içindir; herkese açılacaksa çıkmış-soru bölümü yeniden değerlendirilmelidir.
