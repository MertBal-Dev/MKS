// scripts/trk-*.json → src/content/exams/cikmis-*.json dönüştürücü
import { readFileSync, writeFileSync } from 'node:fs';

const SESSIONS = {
  'subat-2025': {
    id: 'cikmis-2025-subat',
    title: 'Çıkmış Sınav — 23 Şubat 2025 (MKS-1)',
    note: 'Gerçek oturum • 100 soru • 4 şıklı. Kaynak: trkutuphane.com ücretsiz test arşivi. Çözümler için AI Hoca butonunu kullan.',
  },
  'agustos-2025': {
    id: 'cikmis-2025-agustos',
    title: 'Çıkmış Sınav — 10 Ağustos 2025 (MKS-2)',
    note: 'Gerçek oturum • 100 soru • 4 şıklı. Kaynak: trkutuphane.com ücretsiz test arşivi. Çözümler için AI Hoca butonunu kullan.',
  },
  'mart-2026': {
    id: 'cikmis-2026-mart',
    title: 'Çıkmış Sınav — 14 Mart 2026 (MKS-3)',
    note: 'Gerçek oturum • 100 soru • BEŞ şıklı (sınav bu oturumda 5 şıka geçti — MKS-4 için en güncel örnek). Kaynak: trkutuphane.com ücretsiz test arşivi.',
  },
};

// Soru metnine göre konu sınıflandırma (sıra önemli: özelden genele)
const RULES = [
  ['ilk-yardim', /ilk yardım|kanama|kırık|yanık|suni solunum|kalp masajı|turnike|bilinç|nabız|şok pozisyon|zehirlen|heimlich|epilepsi|bayıl|atel|cpr|112/i],
  ['muzecilik', /müze|envanter|eser kaçak|restorasyon|konservasyon|sit alanı|2863|nizamname|kazı izni|höyük kazı|define|tahrip|koruma kurulu/i],
  ['dinler-tarihi', /kilise|konsil|incil|tevrat|sinagog|mihrap|minber|hristiyan|yahudi|budizm|hindu|zerdüşt|patrik|manastır|sema|tarikat|mezhep|cami plan|hac ibadet|kutsal kitap/i],
  ['genel-turizm', /turizm|acenta|acente|rehber|tur operatör|konaklama|otel|plog|cohen|doxey|unwto|türsab|tureb|6326|1618|2634|paket tur|pansiyon|iletişim beceri|meslek etiği|ruhsatname|çalışma kartı|turist tip/i],
  ['osmanli-tarihi', /osmanlı|padişah|yeniçeri|sadrazam|divan-ı|kanuni|fatih|yavuz|tanzimat|meşrutiyet|abdülhamid|abdülmecid|lale devri|tuğra|enderun|tımar|devşirme|fetret|sultan .*(mehmed|murad|selim|süleyman)/i],
  ['genel-turk-tarihi', /göktürk|uygur|hun|orhun|selçuklu|malazgirt|beylik|kaşgarlı|kutadgu|mete|kurultay|talas|karahanlı|gazneli|atatürk|cumhuriyet|kurtuluş savaşı|lozan|tbmm|türk devlet|kut anlayış/i],
  ['halk-bilimi-edebiyat', /karagöz|hacivat|meddah|orta oyunu|mani|türkü|âşık|aşık|halk oyun|zeybek|horon|halay|kilim motif|nevruz|hıdırellez|divan edebiyat|şair|roman|destan|dede korkut|nasreddin|yunus emre|mevlana|halk bilimi|gelenek/i],
  ['sanat-tarihi', /mimar|kubbe|sütun düzen|dor |iyon |korint|çini|minyatür|hat sanat|ebru|mozaik|fresk|bazilika|kervansaray|medrese|kümbet|külliye|heykel|tablo|ressam|kündekari|telkari|pandantif|mukarnas|taç kapı|hipostil|tapınak plan/i],
  ['roma-yunan-bizans', /roma|bizans|yunan|iustinianus|justinianus|konstantin|imparator|hipodrom|ayasofya|polis |sparta|atina|helenistik|sezar|augustus|ortodoks|katolik|agora|forum|hamam|tiyatro yapı/i],
  ['arkeoloji-mitoloji', /mitoloj|tanrı|zeus|hera|apollon|artemis|afrodit|athena|hermes|tümülüs|nekropol|stratigraf|efsane|homeros|ilyada|odysseia|troya|arkeoloj|sitadel|stel|fibula|lahit/i],
  ['anadolu-medeniyetleri', /hitit|frig|urartu|lidya|likya|karya|iyonya|asur|kültepe|çatalhöyük|göbeklitepe|hattuşa|gordion|sardes|kral yolu|medeniyet|kadeş|midas|kibele|bergama|iskender|pers|neolitik|xanthos|ksanthos/i],
  ['turizm-cografyasi', /göl|dağ|nehir|ırmak|bölge|iklim|milli park|plaj|kaplıca|termal|kayak|mağara|şelale|yayla|unesco|coğrafya|hangi il|flora|fauna|bitki|kuş|endemik|akdeniz|karadeniz|ege |orman|delta|ova|yarımada/i],
];

function classify(text) {
  for (const [topic, re] of RULES) if (re.test(text)) return topic;
  return 'genel-turizm';
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

for (const [file, meta] of Object.entries(SESSIONS)) {
  const raw = JSON.parse(readFileSync(`scripts/trk-${file}.json`, 'utf8'));
  const seen = new Set();
  const questions = [];

  for (const item of raw) {
    const stem = String(item.q || '').trim();
    const options = (item.options || []).map((o) => String(o).trim());
    if (!stem || options.length < 4 || options.length > 5) continue;
    if (options.some((o) => !o)) continue;
    if (typeof item.correct !== 'number' || item.correct < 0 || item.correct >= options.length) continue;
    const key = stem.slice(0, 70);
    if (seen.has(key)) continue;
    seen.add(key);

    const n = questions.length + 1;
    const correctLetter = LETTERS[item.correct];
    questions.push({
      id: `${meta.id}-${String(n).padStart(3, '0')}`,
      topicId: classify(stem + ' ' + options.join(' ')),
      subtopic: meta.title.replace('Çıkmış Sınav — ', ''),
      difficulty: 2,
      stem,
      choices: options.map((text, i) => ({
        id: LETTERS[i],
        text,
        explanation:
          i === item.correct
            ? 'Sınavın cevap anahtarına göre doğru şık budur. Ayrıntılı çözüm ve türev sorular için AI Hoca butonunu kullan.'
            : `Cevap anahtarına göre doğru şık ${correctLetter}. Bu şıkkın neden yanlış olduğunu AI Hoca'ya sorabilirsin.`,
      })),
      correct: correctLetter,
    });
  }

  const exam = { id: meta.id, title: meta.title, kind: 'cikmis', note: meta.note, questions };
  writeFileSync(`src/content/exams/${meta.id}.json`, JSON.stringify(exam, null, 1), 'utf8');

  const byTopic = {};
  for (const q of questions) byTopic[q.topicId] = (byTopic[q.topicId] || 0) + 1;
  const optCounts = new Set(questions.map((q) => q.choices.length));
  console.log(`${meta.id}: ${questions.length} soru • şık sayısı: ${[...optCounts].join('/')} `);
  console.log('   ', JSON.stringify(byTopic));
}
