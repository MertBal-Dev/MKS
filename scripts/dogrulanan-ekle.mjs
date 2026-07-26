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
  'turizm-cografyasi': [
    {
      heading: 'Adalar, Sakin Şehirler ve Sık Karıştırılan Sıralamalar',
      markdown: `**Türkiye'nin en büyük adaları — sıralama sınavda tuzaktır:**

| Sıra | Ada | Konum |
|---|---|---|
| **1** | **Gökçeada (İmroz)** | Çanakkale — Ege |
| **2** | **MARMARA ADASI** (~117 km²) | Balıkesir — Marmara Denizi |
| **3** | **Bozcaada (Tenedos)** | Çanakkale — Ege |

**En sık düşülen hata:** Bozcaada'yı "Türkiye'nin ikinci büyük adası" sanmak. Bozcaada, **Ege'nin** Gökçeada'dan sonraki ikincisidir; **Türkiye genelinde üçüncüdür.** İkinci sıra **Marmara Adası**'nındır.

**CITTASLOW (Sakin Şehir):** Hızlı yaşama ve tek tipleşmeye karşı, yerel kimliği ve yaşam kalitesini önceleyen uluslararası şehir ağıdır. Nüfusu **50.000'in altındaki** yerleşimler başvurabilir.

**Türkiye'nin ilk Cittaslow kenti: SEFERİHİSAR (İzmir), 2009.** Türkiye'nin sakin şehirlerinin "başkenti" sayılır. **Bozcaada ve Gökçeada** da Cittaslow ağındadır. Diğerleri arasında Akyaka (Muğla), Taraklı (Sakarya), Şavşat (Artvin), Vize (Kırklareli), Halfeti (Şanlıurfa), Uzundere (Erzurum) sayılabilir.

**Milli park sayısı hakkında uyarı:** Türkiye'de **40'ın üzerinde** milli park vardır ve sayı her yıl değişir (en son eklenenlerden biri Geben Vadisi, 2025). Bu yüzden kesin bir rakam ezberlemek yerine **ilkinin Yozgat Çamlığı (1958)** ve **en büyüğünün Munzur Vadisi** olduğunu bilmek daha güvenlidir — sınav bu ikisini sorar.`,
    },
  ],

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

// Tekrar çalıştırmaya dayanıklı: aynı başlık zaten varsa atlanır.
let n = 0;
for (const [topicId, bolumler] of Object.entries(EKLER)) {
  const yol = `src/content/topics/${topicId}.json`;
  const pack = JSON.parse(readFileSync(yol, 'utf8'));
  const mevcut = new Set(pack.fullNotes.map((s) => s.heading));
  const eklenecek = bolumler.filter((b) => !mevcut.has(b.heading));

  if (eklenecek.length === 0) {
    console.log(`  ${topicId.padEnd(24)} zaten uygulanmış, atlandı`);
    continue;
  }

  pack.fullNotes.push(...eklenecek);
  writeFileSync(yol, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
  n += eklenecek.length;
  console.log(`  ${topicId.padEnd(24)} +${eklenecek.length} → ${pack.fullNotes.length} bölüm`);
}
console.log(`\n${n} bölüm eklendi (hepsi kaynak doğrulamalı)`);
