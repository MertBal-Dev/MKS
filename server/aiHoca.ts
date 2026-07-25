/**
 * AI Hoca — Vertex AI (Gemini) tabanlı çalışma asistanı.
 * İki mod: soru açıklaması (explain) ve serbest sohbet/takip sorusu (chat).
 * Kimlik bilgileri YALNIZCA sunucu tarafında (env) yaşar.
 */
import { GoogleGenAI } from '@google/genai';

export interface AiHocaQuestion {
  stem: string;
  choices: { id: string; text: string }[];
  correct: string;
  selected?: string;
  topicTitle: string;
  subtopic?: string;
}

export interface AiHocaTurn {
  role: 'user' | 'model';
  text: string;
}

/** Konu anlatımını derinleştirme bağlamı: doğrulanmış notlar modele zemin olur. */
export interface AiHocaTopic {
  topicTitle: string;
  /** Derinleştirilecek bölümün başlığı (yoksa konunun tamamı). */
  sectionHeading?: string;
  /** Uygulamadaki doğrulanmış not metni — modelin dayanağı. */
  grounding?: string;
  /** Konunun bilinen tuzakları; tekrar üretilmesin diye modele verilir. */
  tricks?: string[];
  /** Denemede bu konudan kaç soru geldiği. */
  examWeight?: number;
}

export interface AiHocaRequest {
  mode?: 'explain' | 'chat' | 'expand';
  question?: AiHocaQuestion;
  topic?: AiHocaTopic;
  messages?: AiHocaTurn[];
  /**
   * Serbest sohbette istemcinin ilettiği, uygulamanın doğrulanmış içeriğinden
   * seçilmiş ilgili notlar. Modelin kendi hafızası yerine bunlara dayanmasını sağlar.
   */
  grounding?: string;
}

export interface AiHocaEnv {
  GOOGLE_CLOUD_PROJECT?: string;
  GOOGLE_CLOUD_LOCATION?: string;
  GOOGLE_CREDENTIALS_JSON?: string;
}

const MODEL = 'gemini-2.5-flash';

function systemPrompt(): string {
  const today = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Istanbul',
  });
  return `Sen Türkiye'deki Turist Rehberliği Mesleğe Kabul Sınavı (MKS) için öğrenci çalıştıran,
alanına hâkim, sıcak ve cesaretlendirici bir hocasın. Öğrencin 29 Ağustos 2026'daki MKS-4'e hazırlanıyor
ve sınav kaygısı yaşıyor. Türkçe, net ve sınav odaklı konuş. Markdown kullan; başlıkları kısa tut.
Gereksiz girizgah yapma, doğrudan konuya gir. Uzun girizgah ve kapanış cümleleri yazma —
cevabın gövdesi bilgi olsun.

BUGÜNÜN TARİHİ: ${today}. Yapılmış oturumlar: MKS-1 (23 Şubat 2025), MKS-2 (10 Ağustos 2025),
MKS-3 (14 Mart 2026). Sıradaki oturum MKS-4 (29 Ağustos 2026).

ÇIKMIŞ SORULAR HAKKINDA MUTLAK KURAL:
Bu oturumların soruları uygulamanın "Denemeler" bölümünde duruyor ama SEN o soru metinlerini
GÖRMÜYORSUN. Bu yüzden hiçbir oturumun sorusunu, soru numarasını veya içeriğini ASLA yazma;
"12. soruda şu çıkmıştı" türü cümleler kurma. Öğrenci çıkmış soruları sorarsa:
"Bu oturumun soruları uygulamanın Denemeler bölümünde; oradan çözebilirsin" de ve
sınavın GENEL çerçevesini anlatmakla yetin. Uydurma soru üretmek en ağır hatadır.
Belirli bir oturumun neye "ağırlık verdiğini" de söyleme — o oturumu görmedin;
yalnızca sınavın resmi konu dağılımından konuşabilirsin.
(İstisna: Öğrenci sana bir sorunun metnini kendisi verirse onu çözebilirsin.)

DOĞRULUK KURALLARI (en önemli bölüm):
- YALNIZCA yüzde yüz emin olduğun, ders kitabı düzeyinde yerleşik olguları yaz.
- Bir tarihten, isimden veya sayıdan emin değilsen o detayı HİÇ yazma; tahmin etme,
  "yaklaşık/civarı" diyerek de geçiştirme.
- Türev soru üretirken her türevin cevabı tartışmasız tek ve doğrulanabilir olmalı;
  emin olamadığın türevi listeye koyma. Az ama kesin bilgi > çok ama şüpheli bilgi.
- Öğrenci yanlış bir bilgi söylerse nazikçe düzelt.

SINAV BİLGİSİ: 100 soru, 120 dakika, baraj 70. Yanlış doğruyu götürmez.
Mart 2026 oturumundan itibaren sınav 5 şıklı (A-E) hale geldi.

RESMİ KONU DAĞILIMI (14 başlık, toplam 100 soru) — konu sorulduğunda BUNU kullan:
Genel Turizm Bilgisi ve Mevzuatı 15 • Türkiye'nin Tarihi ve Coğrafyası 13 •
Anadolu Medeniyetleri Tarihi 12 • Roma, Yunan ve Bizans Tarihi 8 •
Genel Türk Tarihi ve Kültürü 6 • Arkeoloji ve Mitoloji 6 • Genel Sanat Tarihi 6 •
Türk Halk Bilimi ve Edebiyatı 6 • Genel Sağlık ve İlk Yardım 5 •
İletişim Becerileri ve Etik 5 • Türkiye'nin Flora ve Faunası 5 •
Müzecilik ve Suçlar 5 • Osmanlı İmparatorluğu Tarihi 4 • Dinler Tarihi 4.

ÖNEMLİ: Bu sınav tamamen Türkçe genel konu sınavıdır; İÇİNDE YABANCI DİL BÖLÜMÜ YOKTUR.
Yabancı dil yeterliği mesleğe kabulün ayrı bir ön şartıdır, MKS'nin konusu değildir.`;
}

const SYSTEM = systemPrompt();

function questionContext(q: AiHocaQuestion): string {
  const choiceLines = q.choices.map((c) => `${c.id}) ${c.text}`).join('\n');
  const selectedLine =
    q.selected && q.selected !== q.correct
      ? `Öğrenci ${q.selected} şıkkını seçmişti (yanlış).`
      : q.selected
        ? 'Öğrenci doğru cevabı bulmuştu.'
        : 'Öğrenci bu soruyu inceliyor.';
  return `SORU BAĞLAMI
Konu: ${q.topicTitle}${q.subtopic ? ` — ${q.subtopic}` : ''}
Soru: ${q.stem}
${choiceLines}
Doğru cevap: ${q.correct}
${selectedLine}`;
}

function explainPrompt(q: AiHocaQuestion): string {
  return `${questionContext(q)}

Şu yapıda anlat:
### Neden ${q.correct}?
(2-4 cümle, olgusal derinlik)
### Çeldiriciler neden yanlış?
(her şık için tek cümle)
### Aklında kalsın
(bir ezber tekniği / kanca)
### Bu sorunun türevleri
(Aynı konudan sınavda GELEBİLECEK 3-4 türev soruyu "Soru → Cevap" biçiminde yaz.
Örnek: "• Selimiye'nin mimarı kimdir? → Mimar Sinan (ustalık eseri)".
Yalnızca kesin bildiğin türevleri yaz.)
### Bunu da bil
(aynı konudan 2-3 bağlantılı kesin olgu, madde madde)`;
}

function topicContext(t: AiHocaTopic): string {
  const parts = [`KONU: ${t.topicTitle}`];
  if (t.examWeight) parts.push(`Denemede bu konudan ~${t.examWeight} soru gelir.`);
  if (t.sectionHeading) parts.push(`BÖLÜM: ${t.sectionHeading}`);
  if (t.grounding) parts.push(`ÖĞRENCİNİN ELİNDEKİ DOĞRULANMIŞ NOT:\n"""\n${t.grounding.slice(0, 6000)}\n"""`);
  if (t.tricks?.length) parts.push(`ÖĞRENCİNİN BİLDİĞİ TUZAKLAR (tekrarlama):\n- ${t.tricks.slice(0, 12).join('\n- ')}`);
  return parts.join('\n\n');
}

function expandPrompt(t: AiHocaTopic): string {
  const scope = t.sectionHeading ? `"${t.sectionHeading}" bölümünü` : 'bu konuyu';
  return `${topicContext(t)}

Görev: Yukarıdaki notu temel alarak ${scope} MKS düzeyinde DERİNLEŞTİR.
Nottaki bilgileri tekrar etmek yerine üzerine inşa et; eksik kalan ayrıntıları tamamla.

Şu yapıda yaz:
### Derinlemesine anlatım
(Notta değinilmeyen ama sınavda sorulabilecek ayrıntılar: kimler, nerede, ne zaman,
hangi eser/olay. Akıcı paragraflar, gereksiz süsleme yok.)
### Tablo / kronoloji
(Uygunsa markdown tablo veya sıralı liste ile eşleştirmeleri topla.)
### Sınavda nasıl sorulur
(Bu bölümden çıkabilecek 4-5 soru tipini "Soru → Cevap" biçiminde yaz.)
### Yeni tuzaklar
(Öğrencinin listesinde OLMAYAN, karıştırılması muhtemel 3-4 ayrım.)

Kurallar: Yalnızca kesin bildiğin olguları yaz. Emin olmadığın tarihi, ismi veya sayıyı
hiç yazma. Uydurma eser/kişi/olay üretme.`;
}

function createClient(env: AiHocaEnv): GoogleGenAI {
  if (!env.GOOGLE_CLOUD_PROJECT || !env.GOOGLE_CREDENTIALS_JSON) {
    throw new Error('Vertex AI yapılandırması eksik (GOOGLE_CLOUD_PROJECT / GOOGLE_CREDENTIALS_JSON)');
  }
  return new GoogleGenAI({
    vertexai: true,
    project: env.GOOGLE_CLOUD_PROJECT,
    location: env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    googleAuthOptions: { credentials: JSON.parse(env.GOOGLE_CREDENTIALS_JSON) },
  });
}

/** Hem ilk açıklamayı hem takip sohbetini karşılayan tek giriş noktası. */
export async function runAiHoca(req: AiHocaRequest, env: AiHocaEnv): Promise<string> {
  const ai = createClient(env);
  const mode = req.mode ?? (req.messages?.length ? 'chat' : 'explain');

  let contents: { role: 'user' | 'model'; parts: { text: string }[] }[];
  let systemInstruction = SYSTEM;

  if (mode === 'explain') {
    if (!req.question) throw new Error('explain modu için soru gerekli');
    contents = [{ role: 'user', parts: [{ text: explainPrompt(req.question) }] }];
  } else if (mode === 'expand') {
    if (!req.topic) throw new Error('expand modu için konu gerekli');
    contents = [{ role: 'user', parts: [{ text: expandPrompt(req.topic) }] }];
  } else {
    const turns = req.messages ?? [];
    if (turns.length === 0) throw new Error('chat modu için mesaj gerekli');
    if (req.question) {
      // Soru bağlamını sistem talimatına iliştir: her turda tekrar göndermeye gerek kalmaz
      systemInstruction = `${SYSTEM}\n\nÖğrenci şu soru üzerinde çalışıyor:\n${questionContext(req.question)}`;
    } else if (req.topic) {
      systemInstruction = `${SYSTEM}\n\nÖğrenci şu konuyu çalışıyor:\n${topicContext(req.topic)}`;
    } else if (req.grounding) {
      // Serbest sohbette uygulamanın doğrulanmış notları önceliklidir
      systemInstruction =
        `${SYSTEM}\n\nUYGULAMANIN DOĞRULANMIŞ NOTLARI (kendi hafızanla çelişirse BUNLARA uy):\n` +
        `"""\n${req.grounding.slice(0, 7000)}\n"""`;
    }
    contents = turns.slice(-12).map((t) => ({ role: t.role, parts: [{ text: t.text }] }));
  }

  const result = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction,
      temperature: 0.3,
      /**
       * Gemini 2.5 varsayılan olarak "düşünme" jetonu harcar ve bunlar
       * maxOutputTokens bütçesinden düşülür; bu yüzden cevaplar yarıda kesiliyordu.
       * Bu görev hatırlama + biçimlendirme olduğundan düşünmeyi kapatıp
       * bütçenin tamamını metne ayırıyoruz.
       */
      thinkingConfig: { thinkingBudget: 0 },
      maxOutputTokens: mode === 'expand' ? 8192 : 4096,
    },
  });

  const text = result.text?.trim();
  if (!text) throw new Error('Modelden boş yanıt geldi');
  return text;
}

// Geriye dönük uyumluluk: eski çağrı biçimi
export type AiHocaPayload = AiHocaQuestion;
export async function generateExplanation(payload: AiHocaQuestion, env: AiHocaEnv): Promise<string> {
  return runAiHoca({ mode: 'explain', question: payload }, env);
}
