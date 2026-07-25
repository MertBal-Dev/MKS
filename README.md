# MKS Çalışma Odası

Turist Rehberliği **Mesleğe Kabul Sınavı (MKS)** için kişisel, premium, çevrimdışı çalışan hazırlık uygulaması.
Hedef: **MKS-4 — 29 Ağustos 2026, 10.00**.

## İçinde ne var?

- **12 resmi konu** için 3 katmanlı anlatım: tam anlatım • sınav sabahı kısa anlatımı • **Tuzaklar & Trickler**
- **480 özgün soru** — her şık için "neden doğru / neden yanlış" açıklamalı
- **112 gerçek çıkmış soru** (23 Şubat 2025 oturumu, aday derlemesi)
- **100 soruluk tam deneme** — gerçek format: 120 dk, soru haritası, otomatik teslim, konu kırılımı
- **AI Hoca** — her sorunun altında Vertex AI (Gemini) ile derinlemesine anlatım
- **Akıllı Tekrar** — Leitner kutu sistemli kartlar; yanlış yapılan her soru otomatik karta dönüşür
- **Yanlış Havuzu** — üst üste 2 doğruyla havuzdan çıkış
- **İstatistik** — konu doğruluğu, deneme grafiği, tahmini sınav puanı
- **Sprint Planı** — 29 Ağustos'a gün gün program
- **PWA** — telefonda ana ekrana eklenir, internetsiz çalışır (AI Hoca hariç)

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

## Yedekleme / cihaz değiştirme

İlerleme tarayıcıda saklanır. **Ayarlar → Verini indir** ile JSON yedeği al,
diğer cihazda **Yedekten yükle** ile geri getir.

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
