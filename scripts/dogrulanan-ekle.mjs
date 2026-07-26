/**
 * Karantinadan çıkıp doğrulanan türevleri konu anlatımına ekler.
 *
 *   node scripts/dogrulanan-ekle.mjs
 *
 * Metinler elle yazıldı; her biri scripts/turev-dogrulanan.json içindeki
 * kaynağa dayanır. Modele yazdırılmadı — düzyazı üretimi hatanın girdiği yer.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const EKLER = {
  muzecilik: [
    {
      heading: 'Karun Hazineleri: Kaçakçılık ve İade Öyküsü',
      markdown: `**Karun Hazineleri (Lidya Hazineleri)**, Lidya Kralı **Karun (Kroisos, MÖ 560-546)** dönemine ait **432 parçalık** bir koleksiyondur. Türk müzeciliğinin eser kaçakçılığıyla mücadelesinin simge davasıdır.

**Kaçırılma:** **1965-66 ve 1968** yıllarında **Uşak-Güre** çevresindeki **Toptepe, İkiztepe ve Aktepe** tümülüslerinden kaçak kazılarla çıkarılıp yurt dışına götürüldü.

**Ortaya çıkışı:** **1985**'te New York **Metropolitan Museum**'da sergilenirken fark edildi.

**İade:** Kültür Bakanlığı **1987**'de dava açtı; yaklaşık **40 milyon dolarlık** hukuk mücadelesinin ardından eserler **1993**'te Türkiye'ye döndü. Bu, Türkiye'nin açtığı davayla eser geri kazandığı ilk büyük uluslararası zaferdir.

**Bugün:** **1996**'dan beri **Uşak Arkeoloji Müzesi**'nde sergilenmektedir — yani eserler **ait oldukları yöreye** döndürülmüştür.

**Kanatlı Denizatı Broşu:** Hazinenin en değerli parçalarındandır. **2006**'da müzeden çalınıp yerine sahtesi konulduğu anlaşıldı; **2012**'de Almanya'da bulunarak Interpol aracılığıyla Türkiye'ye getirildi.

**Sınavda sorulur:** Karun Hazineleri **Lidya**'ya aittir ve **Uşak**'ta sergilenir. Uşak yerine İstanbul veya Ankara diyen şıklar çeldiricidir.`,
    },
  ],

  'halk-bilimi-edebiyat': [
    {
      heading: 'Ballıca Mağarası ve Doğal Miras Adaylığı',
      markdown: `**Ballıca Mağarası**, **Tokat**'ın **Pazar** ilçesindedir. Yaklaşık **3,4 milyon yıllık** bir oluşumdur.

**Öne çıkan özellikleri:** Bilinen hemen tüm mağara oluşumlarını bir arada barındırır — **sarkıt, dikit, sütun, perde travertenleri, mağara incileri** ve dünyada ender görülen **soğan sarkıtları**. Ziyarete açık **680 metrelik** bölümünde **sekiz salon** bulunur.

**UNESCO durumu:** **Nisan 2019**'da **UNESCO Dünya Mirası GEÇİCİ Listesi**'ne alınmıştır.

**Kritik ayrım:** *Geçici Liste*, **Dünya Mirası Listesi değildir** — aday listesidir. Türkiye'nin Geçici Liste'sinde 79 varlık varken Dünya Mirası Listesi'nde 22 varlık bulunur. Sınav bu ikisini bilerek karıştırır.

**Diğer önemli mağaralarımız:** Damlataş (Antalya, astım tedavisi), Karain (Antalya, Paleolitik), Dim (Alanya), Cennet-Cehennem (Mersin), Mencilis (Zonguldak), **Yarımburgaz (İstanbul)** — Küçükçekmece Gölü'nün yaklaşık 1,5 km kuzeyinde, yaklaşık **400.000 yıllık** izleriyle Anadolu'nun bilinen **en eski insan yerleşimlerinden**; Alt Paleolitik katmanında **Homo erectus** diş fosili bulunmuştur.`,
    },
  ],
};

let n = 0;
for (const [topicId, bolumler] of Object.entries(EKLER)) {
  const yol = `src/content/topics/${topicId}.json`;
  const pack = JSON.parse(readFileSync(yol, 'utf8'));
  pack.fullNotes.push(...bolumler);
  writeFileSync(yol, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
  n += bolumler.length;
  console.log(`  ${topicId.padEnd(24)} +${bolumler.length} → ${pack.fullNotes.length} bölüm`);
}
console.log(`\n${n} bölüm eklendi (hepsi kaynak doğrulamalı)`);
