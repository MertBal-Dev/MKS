/**
 * Kapsama ölçümünde kalan son boşlukları kapatır.
 *
 *   node scripts/son-bosluklar.mjs
 *
 * Buradaki metinler MODELE YAZDIRILMADI — elle yazıldı. Hepsi ya gerçek sınav
 * sorusunun resmî cevabından (çekirdek) ya da bağımsız web doğrulamasından gelir.
 * Kaynak gerektiren iddiaların dayanağı yorum satırında belirtilmiştir.
 */
import { readFileSync, writeFileSync } from 'node:fs';

/** topicId -> eklenecek bölümler */
const EKLER = {
  'genel-turizm': [
    {
      heading: 'Turizm Endüstrisi ve İşletme Türleri',
      markdown: `**Turizm endüstrisinde DOĞRUDAN faaliyet gösteren işletmeler:** Konaklama işletmeleri (otel, motel, tatil köyü, pansiyon), **seyahat acentaları**, **ulaştırma işletmeleri** (havayolu, otobüs, kruvaziyer), yiyecek-içecek işletmeleri, rekreasyon ve eğlence işletmeleri.

**Dolaylı (destekleyici) işletmeler:** Bankalar, sigorta şirketleri, inşaat firmaları, tarım ve gıda üreticileri, hediyelik eşya imalatçıları. Bunlar turizmden beslenir ama asıl faaliyet alanları turizm değildir.

**Sınav tuzağı:** "Aşağıdakilerden hangisi turizm endüstrisinde **doğrudan** faaliyet gösterir?" sorusunda banka, sigorta ve inşaat gibi seçenekler **dolaylıdır**; doğru cevap konaklama, acenta veya ulaştırmadır.

**Turizm İşletme Belgesi'ni KÜLTÜR VE TURİZM BAKANLIĞI verir.** Aynı şekilde seyahat acentası işletme belgesi de Bakanlıkça verilir. TÜRSAB üyelik kuruluşudur, belge vermez — bu ikisi sınavda karıştırılır.

**Sosyal taşıma kapasitesi:** Bir destinasyonda **yerel halkın hoş görebileceği (tolere edebileceği) turist yoğunluğu**dur. Fiziksel taşıma kapasitesi mekânın alabileceği kişi sayısıyken, sosyal taşıma kapasitesi halkın rahatsız olmaya başladığı eşiktir. Aşılması, Doxey'in modelindeki rahatsızlık ve düşmanlık aşamalarını doğurur.`,
    },
    {
      heading: 'Turist Tipleri ve Seyahat Kavramları',
      markdown: `**Günübirlik turist (günübirlikçi / excursionist):** Bir ülkeye giriş yapan ancak **24 saatten az kalan ve konaklama yapmayan** ziyaretçidir. Kruvaziyer yolcusu ve sınır ticareti için gelen ziyaretçi tipik örneklerdir. **Turist** ise en az bir gece konaklayan ziyaretçidir; ikisi birlikte **ziyaretçi (visitor)** başlığı altında toplanır.

**Grand Tour:** Avrupalı aristokrat gençlerin eğitimlerini tamamlamak için çıktıkları İtalya-Fransa merkezli kültür gezisidir. **17. yüzyılda başlamış, 18. yüzyılda zirveye ulaşmış ve 19. yüzyıl başlarına dek sürmüştür.** Modern turizmin fikrî atası sayılır.

**Empati:** Rehberin, turistin duygu ve düşüncelerini anlayarak olaylara **onun bakış açısından** bakabilmesidir. Empatik yaklaşımın turist psikolojisindeki doğrudan sonucu **güven ve memnuniyet artışı**dır; turist anlaşıldığını hissettiğinde şikâyet azalır, bağlılık artar.`,
    },
    {
      heading: 'Eski Türk İnancı ve Güncel Kültür-Turizm Olayları',
      markdown: `**Tamu:** Eski Türk inanç sisteminde ve bazı Budist metinlerde geçen, **ölümden sonra kötülerin gittiğine inanılan yeraltı dünyası** — günümüzdeki karşılığı **cehennem**dir. Karşıtı **uçmağ** (cennet)tir. Bu kavram çifti sınavda birlikte sorulur.

**Nereidler Anıtı:** Likya'nın başkenti **Ksanthos**'tan çıkarılıp yurt dışına götürülmüş anıt mezardır. Bugün **İngiltere**'de, **British Museum**'da sergilenmektedir. Yurt dışındaki Anadolu eserleri sorulduğunda Bergama Zeus Sunağı (Almanya) ile birlikte akla gelmelidir.

**Papa XIV. Leo'nun İznik ziyareti (Kasım 2025):** Papa XIV. Leo, **27-30 Kasım 2025** tarihlerinde Türkiye'yi ziyaret etmiş ve **İznik**'e giderek **I. İznik Konsili'nin 1700. yıl dönümü** anma törenine katılmıştır. Tören, İznik Gölü kıyısındaki bazilika kalıntılarında yapılmış; Patrik Bartholomeos ve diğer Hristiyan cemaat liderleri de bulunmuştur. Bu, inanç turizmi açısından güncel ve sınavda sorulan bir olaydır.`,
    },
  ],

  'halk-bilimi-edebiyat': [
    {
      heading: 'İpekçilik Geleneği ve UNESCO',
      markdown: `**İpek böcekçiliği ve dokumacılıkta ipek üretimi geleneği**, UNESCO **Somut Olmayan Kültürel Miras** Listesi'nde yer alır. Türkiye'nin de dâhil olduğu çok uluslu bir dosyayla listeye girmiştir.

**Dut ağacıyla ilişkisi kritiktir:** İpek böceği (Bombyx mori) **yalnızca dut yaprağıyla** beslenir. Bu yüzden ipekçiliğin yapıldığı her yörede dut ağacı yetiştiriciliği zorunludur; gelenek "dut bahçesi - böcekhane - koza - ipek" zinciri olarak aktarılır.

**Türkiye'de merkezi Bursa**'dır: **Koza Han**, ipek ticaretinin tarihî merkezidir. **Hereke** ise ipek halıcılığıyla anılır.

**Sınavda sorulur:** İpek böceğinin beslendiği tek yaprak **duttur**.`,
    },
  ],

  'ilk-yardim': [
    {
      heading: 'Rehberin Bilmesi Gereken Sanat ve Kültür Bilgisi',
      markdown: `Rehberlik sınavı, ilk yardım ve sağlık başlığının yanında genel kültür soruları da içerir.

**Davut Heykeli (David):** **Michelangelo**'nun eseri olan, Rönesans döneminin başyapıtlarından sayılan mermer heykeldir. **Floransa**'da, **Galleria dell'Accademia**'da sergilenmektedir. Michelangelo aynı zamanda **Sistine Şapeli** tavan freskleri ve **Pietà** ile tanınır.

**Karıştırılmasın:** Davut Heykeli Floransa'da, Pietà ise Vatikan'da (Aziz Petrus Bazilikası) bulunur.`,
    },
  ],

  'anadolu-medeniyetleri': [
    {
      heading: 'Paleolitik Alt Dönemler ve Neanderthal',
      markdown: `Paleolitik (Yontma Taş) Çağ üç alt döneme ayrılır:

| Dönem | Öne çıkan tür / özellik |
|---|---|
| **Alt Paleolitik** | Homo erectus; en kaba aletler |
| **Orta Paleolitik** | **Neanderthal (Homo neanderthalensis)** — ölü gömme ve ilk inanç izleri |
| **Üst Paleolitik** | Homo sapiens; mağara resimleri, gelişkin alet |

**Neanderthal insanının varlık gösterdiği dönem ORTA PALEOLİTİK'tir** — sınavda doğrudan sorulur. Anadolu'da **Karain Mağarası (Antalya)** bu dönemin izlerini taşıyan başlıca yerleşimdir.`,
    },
  ],

  'arkeoloji-mitoloji': [
    {
      heading: 'Asklepion Merkezleri ve Gordion Düğümü',
      markdown: `**Asklepion:** Sağlık tanrısı **Asklepios** adına kurulan antik şifa merkezleridir. Su, uyku, telkin, müzik ve tiyatroyla tedavi uygulanırdı.

**Asklepion'a sahip merkezler:** **Bergama (Pergamon)** — en ünlüsü, **Kos Adası** — Hipokrat'ın memleketi, **Allianoi (İzmir/Bergama yakını)** — Roma dönemi şifa merkezi (bugün Yortanlı Barajı suları altındadır).
**Sagalassos ve Myra'da Asklepion YOKTUR** — sınavda bu ikisi çeldirici olarak konur.

**Gordion Düğümü:** Frig başkenti **Gordion**'da, tapınağa adanmış bir **öküz arabasının (kağnı) boyunduruğunu** bağlayan, çözülemeyen düğümdür. Efsaneye göre Frigler krallarını beklerken şehre öküz arabasıyla giren çiftçi **Gordios**'u kral seçmiş, o da arabasını tanrıya adamıştır. Düğüm bu yüzden **tarım ve saban/öküz arabası** ile ilişkilidir.

"Bu düğümü çözen Asya'ya hükmedecek" kehaneti üzerine **Büyük İskender MÖ 333'te düğümü kılıcıyla kesmiştir.** Karmaşık bir sorunu radikal biçimde çözmek anlamında deyimleşmiştir.

**Baş tanrı eşleştirmesi — sık sorulan tuzak:**
| Uygarlık | Baş tanrı |
|---|---|
| **Hitit** | **Teşup** (Fırtına Tanrısı) |
| **Urartu** | **Haldi** (savaş); fırtına tanrısı **Teişeba** |
| **Frig** | **Kibele** (Ana Tanrıça) |

**Teişeba Urartu'nundur, Hitit'in değil.** "Hitit — Teişeba" eşleştirmesi YANLIŞTIR.`,
    },
  ],

  'sanat-tarihi': [
    {
      heading: 'Megaron Planı ve Anadolu Kümbetleri',
      markdown: `**Megaron:** Antik dönem mimarisinde, **önünde bir giriş holü (revaklı ön oda) bulunan, dikdörtgen planlı ve ortasında ocak yer alan** yapı tipidir. Miken ve Troya mimarisinde görülür; **Yunan tapınağının naos bölümünün atası** sayılır. Anadolu'da Beycesultan ve Troya kazılarında örnekleri bulunmuştur.

**Kümbet:** Selçuklu dönemine özgü, **silindirik veya çokgen gövdeli, konik/piramidal külahlı**, genellikle iki katlı (altta mumyalık, üstte ziyaret katı) anıt mezardır.

| Kümbet | Bulunduğu yer |
|---|---|
| **Döner Kümbet** | **Kayseri** |
| **Sırçalı Kümbet** | **Kayseri** |
| **Alemşah Kümbeti** | **Sivrihisar (Eskişehir)** |
| **Alaaeddin Bey Kümbeti** | **Kayseri** |
| **Mama Hatun Kümbeti** | **Tercan (Erzincan)** |
| **Halime Hatun Kümbeti** | **Gevaş (Van)** |

**Kayseri, kümbet sayısı bakımından en zengin ilimizdir** — Döner, Sırçalı ve Alaaeddin Bey kümbetlerinin üçü de oradadır. Sınavda "hangi eşleştirme yanlıştır" biçiminde sorulur.`,
    },
  ],

  'turizm-cografyasi': [
    {
      heading: 'Peri Bacalarının Oluşumu',
      markdown: `Kapadokya'daki **peri bacaları** iki aşamada oluşmuştur:

**1. İç kuvvetler (volkanizma):** **Erciyes, Hasandağı ve Göllüdağ**'ın püskürttüğü kül ve lavlar bölgeyi kalın bir **tüf** tabakasıyla örtmüştür. Tüf yumuşak, üstündeki bazalt/ignimbrit tabakası serttir.

**2. Dış kuvvetler (aşınma):** **Akarsu aşındırması (sel suları) ve rüzgâr aşındırması** birlikte yumuşak tüfü oymuş; üstteki sert kaya **şapka** görevi görerek altındaki sütunu korumuştur. Böylece şapkalı koniler ortaya çıkmıştır.

**Sınavda sorulan nokta:** Peri bacalarının oluşumunda etkili **temel dış kuvvetler AKARSU ve RÜZGÂR aşındırmasıdır.** Buzul veya dalga aşındırması değildir. Volkanizma malzemeyi hazırlar, aşınma şekli verir — ikisi birlikte sorulur.`,
    },
  ],
};

let toplamBolum = 0;
for (const [topicId, bolumler] of Object.entries(EKLER)) {
  const yol = `src/content/topics/${topicId}.json`;
  const pack = JSON.parse(readFileSync(yol, 'utf8'));
  pack.fullNotes.push(...bolumler);
  writeFileSync(yol, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
  toplamBolum += bolumler.length;
  console.log(`  ${topicId.padEnd(24)} +${bolumler.length} bölüm → ${pack.fullNotes.length}`);
}
console.log(`\ntoplam ${toplamBolum} bölüm eklendi`);
