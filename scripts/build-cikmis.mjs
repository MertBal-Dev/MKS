// cikmis-raw.json → src/content/exams/cikmis-2025-subat.json dönüştürücü
import { readFileSync, writeFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync('scripts/cikmis-raw.json', 'utf8'));

const TOPIC_RULES = [
  ['ilk-yardim', /ilk yardım|kanama|kırık|yanık|solunum|kalp masajı|turnike|bilinç|nabız|şok|zehirlen|heimlich|epilepsi|bayıl/i],
  ['muzecilik', /müze|envanter|eser kaçak|restorasyon|konservasyon|sit alanı|2863|nizamname|lahit|kazı izni|unesco listesi|ören yeri/i],
  ['dinler-tarihi', /kilise|konsil|incil|tevrat|sinagog|cami|mihrap|minber|hristiyan|yahudi|islam|budizm|hindu|zerdüşt|patrik|aziz|meryem|peygamber|manastır|sema|tarikat|mezhep/i],
  ['genel-turizm', /turist tipolojisi|turizm|acenta|rehber|tur operatörü|konaklama|plog|cohen|doxey|unwto|türsab|tureb|6326|1618|2634|kapitülasyon turizm|paket tur|pansiyon/i],
  ['osmanli-tarihi', /osmanlı|padişah|sultan|yeniçeri|sadrazam|divan-ı|fetih|kanuni|fatih|yavuz|tanzimat|meşrutiyet|abdül|mehmed|murad|bayezid|lale devri|ferman|saray|harem|tuğra/i],
  ['genel-turk-tarihi', /göktürk|uygur|hun|orhun|selçuklu|malazgirt|beylik|kaşgarlı|kutadgu|dede korkut kağan|mete|kurultay|talas|karahanlı|gazneli|atatürk|cumhuriyet|milli mücadele|lozan|tbmm/i],
  ['halk-bilimi-edebiyat', /karagöz|hacivat|meddah|orta oyunu|mani|türkü|aşık|destan|halk oyunu|zeybek|horon|halay|kilim motif|nevruz|hıdırellez|divan edebiyatı|şair|roman|nobel|dede korkut/i],
  ['sanat-tarihi', /mimar|cami mimari|kubbe|sütun|dor|iyon|korint|çini|minyatür|hat sanatı|ebru|mozaik|fresk|tiyatro yapısı|bazilika|kervansaray|medrese|kümbet|külliye|heykel|tablo|ressam|kündekari|telkari|pandantif/i],
  ['roma-yunan-bizans', /roma|bizans|yunan|iustinianus|justinianus|konstantin|imparator|hipodrom|ayasofya|polis|sparta|atina|helen|pers savaş|sezar|augustus|latin|ortodoks|katolik/i],
  ['arkeoloji-mitoloji', /mitoloji|tanrı|zeus|hera|apollon|artemis|afrodit|athena|hermes|höyük|tümülüs|kazı|arkeolo|nekropol|stratigrafi|efsane|homeros|ilyada|odysseia|truva|mozaiği/i],
  ['anadolu-medeniyetleri', /hitit|frig|urartu|lidya|likya|karya|iyonya|asur|kültepe|çatalhöyük|göbeklitepe|hattuşa|gordion|sardes|kral yolu|medeniyet|kadeş|midas|kibele|bergama krallığı|iskender/i],
  ['turizm-cografyasi', /göl|dağ|nehir|ırmak|bölge|iklim|milli park|plaj|kaplıca|termal|kayak|mağara|şelale|yayla|unesco|coğrafya|il|kent|nerede|hangi ilde|bulunmaktadır/i],
];

function classify(text) {
  for (const [topic, re] of TOPIC_RULES) if (re.test(text)) return topic;
  return 'genel-turizm';
}

const LETTERS = ['A', 'B', 'C', 'D'];
const seen = new Set();
const questions = [];

for (const item of raw) {
  if (!item.q || !Array.isArray(item.options) || item.options.length !== 4) continue;
  if (typeof item.answer !== 'number' || item.answer < 0 || item.answer > 3) continue;
  if (item.options.some((o) => !o)) continue;
  const key = item.q.slice(0, 80);
  if (seen.has(key)) continue;
  seen.add(key);

  const n = questions.length + 1;
  const correctLetter = LETTERS[item.answer];
  const fullText = item.q + ' ' + item.options.join(' ');
  questions.push({
    id: `cikmis-2025-subat-${String(n).padStart(3, '0')}`,
    topicId: classify(fullText),
    subtopic: 'Şubat 2025 oturumu',
    difficulty: 2,
    stem: item.q,
    choices: item.options.map((text, i) => ({
      id: LETTERS[i],
      text,
      explanation:
        i === item.answer
          ? 'Derlemedeki doğru cevap budur. Derinlemesine anlatım için AI Hoca butonunu kullan.'
          : `Derlemeye göre doğru cevap ${correctLetter} şıkkıdır. Gerekçesi için AI Hoca'ya sorabilirsin.`,
    })),
    correct: correctLetter,
  });
}

const exam = {
  id: 'cikmis-2025-subat',
  title: 'Çıkmış Sorular — 23 Şubat 2025 (MKS-1)',
  kind: 'cikmis',
  note: 'Aday derlemelerinden aktarılmıştır; resmi kitapçık değildir. Her sorunun derin açıklaması için çözümden sonra AI Hoca kullanılabilir.',
  questions,
};

writeFileSync('src/content/exams/cikmis-2025-subat.json', JSON.stringify(exam, null, 1), 'utf8');
const byTopic = {};
for (const q of questions) byTopic[q.topicId] = (byTopic[q.topicId] || 0) + 1;
console.log('OK', questions.length, 'soru yazıldı');
console.log(byTopic);
