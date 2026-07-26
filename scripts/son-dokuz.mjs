/**
 * Kapsama ölçümünde kalan son 9 boşluğu kapatır (8 kısmi + 1 eksik).
 *
 *   node scripts/son-dokuz.mjs
 *
 * Metinler elle yazıldı. Fosil bilgisi bağımsız web doğrulamasından,
 * geri kalanı gerçek sınav sorularının resmî cevaplarından gelir.
 * Tekrar çalıştırmaya dayanıklıdır.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const EKLER = {
  'anadolu-medeniyetleri': [
    {
      heading: 'Yazının İcadı ve Başkent Eşleştirmeleri',
      markdown: `**Yazıyı icat eden uygarlık SÜMERLER'dir.** MÖ 3200 civarında Mezopotamya'da **çivi yazısını** geliştirmişler ve böylece **tarih çağlarını başlatmışlardır.** Dünya genelinde tarih çağlarının başlangıcı **Sümerler**e, **Anadolu'da** ise yazıyı getiren **Asur Ticaret Kolonileri**ne bağlanır. Sınavda bu ikisi ayrı sorulur:
- "Tarihte yazıyı icat eden uygarlık?" → **Sümerler**
- "Anadolu'da tarih çağlarını başlatan?" → **Asur Ticaret Kolonileri (Kültepe)**

**UYGARLIK — BAŞKENT EŞLEŞTİRMESİ (en sık sorulan tablo):**

| Uygarlık | Başkenti |
|---|---|
| **Hitit** | **Hattuşa** (Boğazkale/Çorum) |
| **Frig** | **Gordion** (Polatlı/Ankara) |
| **Urartu** | **Tuşpa** (Van) |
| **Lidya** | **SARDES** (Salihli/Manisa) |
| **Karia** | **Halikarnassos** (Bodrum/Muğla) |
| **Likya** | **Ksanthos** — birlik merkezi **Patara** |
| **İyonya** | Birlik hâlinde; dinî merkez **Panionion** |

**En çok tuzağa düşürülen iki eşleştirme:**
1. **"Sardes — Karya" YANLIŞTIR.** Sardes **Lidya**'nın başkentidir; Karia'nın merkezi **Halikarnassos**'tur.
2. **"Aigai — Likya" YANLIŞTIR.** **Aigai (Nemrutkale, Manisa/Yunusemre)** bir **Aiolis** kentidir, Likya'da değildir. Likya kentleri Ksanthos, Patara, Myra, Olympos, Tlos ve Letoon'dur.`,
    },
  ],

  'arkeoloji-mitoloji': [
    {
      heading: 'Gordios, Kördüğüm ve Frig Kraliyeti',
      markdown: `**Gordios**, Frig Krallığı'nın kurucusu sayılan **Frig kralıdır** ve ünlü **Kral Midas'ın babasıdır.** Efsaneye göre Frigler krallarını beklerken kehanet uyarınca şehre **öküz arabasıyla (kağnı) giren ilk kişiyi** kral seçmişler; bu kişi çiftçi **Gordios** olmuştur. Kral olduktan sonra arabasını tanrı Zeus'a adamış, başkente de adını vermiştir: **Gordion.**

**Gordion Düğümü (Kördüğüm):** Gordios'un arabasının boyunduruğunu tapınağa bağlayan, ucu görünmeyen ve **kimsenin çözemediği düğümdür.** "Bu **kördüğümü** çözen Asya'ya hükmedecek" kehaneti yayılmıştır.

**MÖ 333'te Büyük İskender** Gordion'a geldiğinde düğümü çözmeye uğraşmak yerine **kılıcıyla kesmiştir.** Ardından Anadolu'yu ve Pers İmparatorluğu'nu ele geçirmiştir.

**Deyim olarak:** "Gordion düğümünü kesmek" = çözülemez görünen bir sorunu alışılmışın dışında, radikal bir hamleyle çözmek.

**Sınavda sorulan biçim:** "Kördüğümü bir kılıç darbesiyle çözen kişi kimdir?" → **Büyük İskender.** "Düğüm kime aittir?" → **Gordios (Midas'ın babası, Frig kralı).**`,
    },
  ],

  'genel-turizm': [
    {
      heading: 'Plog\'un Turist Tipolojisi ve Grand Tour Dönemi',
      markdown: `**STANLEY PLOG'UN TİPOLOJİSİ** turistleri **psikografik (kişilik) özelliklerine** göre sınıflandırır. İki uç ve aradaki geçiş grubundan oluşur:

| Tip | Diğer adı | Davranışı |
|---|---|---|
| **PSYCHOCENTRIC (Psikosentrik)** | **İÇE DÖNÜK** — "dependable" | **Tanıdık, güvenli, denenmiş** destinasyonları seçer. **Paket tur** ve organize seyahati tercih eder. Riskten kaçınır, sürprizi sevmez |
| **MIDCENTRIC** | Orta grup | İkisinin arasında; turistlerin **çoğunluğu** buradadır |
| **ALLOCENTRIC (Allosentrik)** | **DIŞA DÖNÜK** — "venturer" | **Maceraperest**, yenilik ve keşif arar. **Az bilinen, egzotik** yerlere gider, plansız/bireysel seyahat eder, yerel kültürle iç içe olur |

**Ezber kancası:** *Psycho-* = **kendine dönük**, kendi konfor alanında kalır → **içe dönük**. *Allo-* = **başkasına/dışa dönük** (Yunanca *allos* = başka) → **dışa dönük, maceraperest.**

**Destinasyon yaşam döngüsüyle bağı:** Bir yer önce **allosentrikler** tarafından keşfedilir, sonra midcentrikler gelir, popülerleşince **psikosentriklere** kalır. Allosentrikler o noktada yeni yerlere gider.

**Terim uyarısı:** Plog'un kullandığı terim **"psychocentric" (psikosentrik)**tir. **"Psikometrik" TERİMİ YANLIŞTIR** — psikometri, psikolojik ölçme yöntemlerini anlatan ayrı bir kavramdır. Sınavda "psikometrik ve allosentrik" biçiminde verilen şık **hatalıdır.**

**GRAND TOUR:** Avrupalı aristokrat gençlerin eğitimlerini tamamlamak için çıktıkları İtalya-Fransa merkezli kültür gezisidir. **17. yüzyılda başlamış, YOĞUN OLARAK 18. VE 19. YÜZYILLARDA yaşanmıştır.** Demiryolunun yaygınlaşmasıyla 19. yüzyıl ortasında sona ermiştir. Modern turizmin ve kültür turizminin fikrî atası sayılır.`,
    },
  ],

  'sanat-tarihi': [
    {
      heading: 'Megaron ve Kümbet Yer Eşleştirmeleri',
      markdown: `**MEGARON:** Antik dönem mimarisinde, **önünde bir giriş holü (sütunlu ön oda / pronaos)** bulunan, **dikdörtgen planlı** ve **ortasında ocak (hearth)** yer alan yapı tipidir. Üç öge birlikte tanımı oluşturur: **giriş holü + dikdörtgen plan + ocak.**

Troya, Miken ve Beycesultan kazılarında örnekleri bulunmuştur. **Yunan tapınağının naos (cella) bölümünün atası** sayılır — tapınak planı megarondan türemiştir.

**KÜMBET — İL EŞLEŞTİRMESİ:** Kümbet, Selçuklu dönemine özgü, silindirik/çokgen gövdeli, **konik veya piramidal külahlı**, çoğunlukla iki katlı (altta mumyalık, üstte ziyaret katı) anıt mezardır.

| Kümbet | İl |
|---|---|
| **Döner Kümbet** | **KAYSERİ** |
| **Sırçalı Kümbet** | **KAYSERİ** |
| **Alaaeddin Bey Kümbeti** | **KAYSERİ** |
| **Alemşah Kümbeti** | **Sivrihisar (ESKİŞEHİR)** |
| **Mama Hatun Kümbeti** | **Tercan (ERZİNCAN)** |
| **Halime Hatun Kümbeti** | **Gevaş (VAN)** |
| **Hüdavend Hatun Kümbeti** | **NİĞDE** |

**Sınav tuzağı:** **Kayseri, kümbet bakımından en zengin ilimizdir** — Döner, Sırçalı ve Alaaeddin Bey kümbetlerinin **üçü de Kayseri'dedir.** Bunlardan birini **Erzincan** veya başka bir ile bağlayan eşleştirme **yanlıştır.** Erzincan'daki kümbet **Mama Hatun**'dur (Tercan).`,
    },
  ],

  'turizm-cografyasi': [
    {
      heading: 'Anadolu\'nun Jeolojik Oluşumu ve Deniz Fosilleri',
      markdown: `Anadolu, bugünkü şeklini **Tetis (Tethys) Denizi**'nin kapanmasıyla almıştır. Afrika-Arabistan levhası ile Avrasya levhası arasında kalan bu denizin tabanındaki **killi ve kireçli çökeller**, deniz canlılarının birikmesiyle oluşmuş; **Alp-Himalaya orojenezi** sırasında kıvrılarak **Kuzey Anadolu Dağları ve Toroslar**'ı meydana getirmiştir.

**Bu yüzden bugün deniz seviyesinden yüzlerce metre yüksekteki dağlarda deniz canlısı fosilleri bulunur** — Anadolu'nun bir zamanlar deniz altında olduğunun kanıtıdır.

**Fosillerin en yoğun bulunduğu yer: ANTALYA ve çevresindeki Toroslar.** Burada **istiridye, deniz kabuklusu, salyangoz, mercan, su kaplumbağası** fosilleri saptanmıştır. Bu fosiller **Miyosen dönemine** ait olup yaklaşık **15-23 milyon yaşındadır.** Orta Toroslar'da Karaman-Mut havzasına kadar uzanan Miyosen denizi kalıntıları da aynı sürecin izleridir.

**Türkiye'nin jeolojik zaman çizelgesindeki yeri:**
- **I. Zaman (Paleozoyik):** Zonguldak taş kömürü yatakları oluştu
- **II. Zaman (Mesozoyik):** Tetis Denizi'nde kalın tortul birikim
- **III. Zaman (Senozoyik/Tersiyer):** **Alp-Himalaya kıvrımları** — Türkiye dağları oluştu, **linyit ve petrol** yatakları, volkanizma
- **IV. Zaman (Kuaterner):** Boğazlar oluştu, Ege'de çöküntüler, bugünkü görünüm ortaya çıktı

**Sınavda sorulur:** Türkiye'nin bugünkü yer şekilleri esas olarak **III. Zaman'da (Alp-Himalaya orojenezi)** oluşmuştur.`,
    },
  ],
};

let n = 0;
for (const [topicId, bolumler] of Object.entries(EKLER)) {
  const yol = `src/content/topics/${topicId}.json`;
  const pack = JSON.parse(readFileSync(yol, 'utf8'));
  const mevcut = new Set(pack.fullNotes.map((s) => s.heading));
  const eklenecek = bolumler.filter((b) => !mevcut.has(b.heading));

  if (eklenecek.length === 0) {
    console.log(`  ${topicId.padEnd(24)} zaten uygulanmış`);
    continue;
  }
  pack.fullNotes.push(...eklenecek);
  writeFileSync(yol, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
  n += eklenecek.length;
  console.log(`  ${topicId.padEnd(24)} +${eklenecek.length} → ${pack.fullNotes.length} bölüm`);
}
console.log(`\n${n} bölüm eklendi`);
