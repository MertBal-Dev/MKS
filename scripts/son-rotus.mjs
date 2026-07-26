/**
 * Son rötuşlar: doğrulanamayan bir iddiayı kaldırır, eksik ifadeyi tamamlar.
 *
 *   node scripts/son-rotus.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

/**
 * 1) "Alaaeddin Bey Kümbeti | KAYSERİ" satırı kaldırılıyor.
 *    Döner ve Sırçalı kümbetlerin Kayseri'de olduğu kaynakla doğrulandı, ama
 *    Alaaeddin Bey Kümbeti için güvenilir bir yer bilgisi bulunamadı.
 *    Doğrulanamayan bir yeri iddia etmektense satırı hiç yazmamak doğru.
 */
{
  const yol = 'src/content/topics/sanat-tarihi.json';
  const pack = JSON.parse(readFileSync(yol, 'utf8'));
  let degisti = false;

  for (const s of pack.fullNotes) {
    if (s.markdown.includes('Alaaeddin Bey Kümbeti')) {
      s.markdown = s.markdown
        .split('\n')
        .filter((l) => !l.includes('**Alaaeddin Bey Kümbeti**'))
        .join('\n')
        .replace(
          /\*\*Sınav tuzağı:\*\*[^\n]*Döner, Sırçalı ve Alaaeddin Bey kümbetlerinin \*\*üçü de Kayseri'dedir\.\*\*/,
          "**Sınav tuzağı:** **Kayseri, kümbet bakımından en zengin ilimizdir** — **Döner Kümbet ve Sırçalı Kümbet'in ikisi de Kayseri'dedir** (Döner Kümbet, I. Alaeddin Keykubad'ın kızı Şah Cihan Hatun için 1276'da yapılmıştır).",
        );
      degisti = true;
    }
  }
  if (degisti) {
    writeFileSync(yol, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
    console.log('  sanat-tarihi: doğrulanamayan kümbet satırı kaldırıldı');
  } else {
    console.log('  sanat-tarihi: değişiklik gerekmedi');
  }
}

/**
 * 2) Turizmin plansız gelişmesinin olumsuz sonuçları arasında
 *    "çevre kirliliği" ve "doğal dokunun bozulması" açıkça yazılıyor.
 */
{
  const yol = 'src/content/topics/genel-turizm.json';
  const pack = JSON.parse(readFileSync(yol, 'utf8'));
  const baslik = 'Plansız Turizmin Olumsuz Sonuçları';

  if (pack.fullNotes.some((s) => s.heading === baslik)) {
    console.log('  genel-turizm: zaten uygulanmış');
  } else {
    pack.fullNotes.push({
      heading: baslik,
      markdown: `Turizm plansız geliştiğinde getirdiği kazancın karşılığında kalıcı zararlar bırakır. Sınavda "aşağıdakilerden hangisi plansız turizmin sonucudur" biçiminde sorulur.

**Çevresel sonuçlar:**
- **Çevre kirliliği** — atık su, katı atık, deniz ve hava kirliliği
- **Doğal dokunun bozulması** — kıyı dolgusu, betonlaşma, bitki örtüsünün tahribi, kumul ve sulak alanların yok olması
- **Taşıma kapasitesinin aşılması** ve **aşırı turizm (overtourism)**
- Su kaynaklarının tükenmesi, erozyon, canlı türlerinin habitat kaybı (örn. Caretta caretta yuvalama kumsallarının ışık ve gürültüyle bozulması)

**Ekonomik sonuçlar:** Arazi ve konut fiyatlarının aşırı yükselmesi, yerel halkın geçim maliyetinin artması, mevsimlik ve güvencesiz istihdam, dışa bağımlılık.

**Sosyo-kültürel sonuçlar:** Kültürel yozlaşma, geleneksel el sanatlarının turistik kitsch'e dönüşmesi, **demonstrasyon (gösteriş) etkisi**, yerel halkın turiste karşı tepkisinin artması.

**Çözüm çerçevesi:** **Sürdürülebilir turizm** — çevresel, ekonomik ve sosyo-kültürel ayakları birlikte gözeten planlama; taşıma kapasitesinin belirlenmesi ve aşılmaması.`,
    });
    writeFileSync(yol, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
    console.log(`  genel-turizm: +1 → ${pack.fullNotes.length} bölüm`);
  }
}
