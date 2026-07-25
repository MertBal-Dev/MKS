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

export interface AiHocaRequest {
  mode?: 'explain' | 'chat';
  question?: AiHocaQuestion;
  messages?: AiHocaTurn[];
}

export interface AiHocaEnv {
  GOOGLE_CLOUD_PROJECT?: string;
  GOOGLE_CLOUD_LOCATION?: string;
  GOOGLE_CREDENTIALS_JSON?: string;
}

const MODEL = 'gemini-2.5-flash';

const SYSTEM = `Sen Türkiye'deki Turist Rehberliği Mesleğe Kabul Sınavı (MKS) için öğrenci çalıştıran,
alanına hâkim, sıcak ve cesaretlendirici bir hocasın. Öğrencin 29 Ağustos 2026'daki MKS-4'e hazırlanıyor
ve sınav kaygısı yaşıyor. Türkçe, net ve sınav odaklı konuş. Markdown kullan; başlıkları kısa tut.
Gereksiz girizgah yapma, doğrudan konuya gir.

DOĞRULUK KURALLARI (en önemli bölüm):
- YALNIZCA yüzde yüz emin olduğun, ders kitabı düzeyinde yerleşik olguları yaz.
- Bir tarihten, isimden veya sayıdan emin değilsen o detayı HİÇ yazma; tahmin etme,
  "yaklaşık/civarı" diyerek de geçiştirme.
- Türev soru üretirken her türevin cevabı tartışmasız tek ve doğrulanabilir olmalı;
  emin olamadığın türevi listeye koyma. Az ama kesin bilgi > çok ama şüpheli bilgi.
- Öğrenci yanlış bir bilgi söylerse nazikçe düzelt.

SINAV BİLGİSİ: 100 soru, 120 dakika, baraj 70. Yanlış doğruyu götürmez.
Mart 2026 oturumundan itibaren sınav 5 şıklı (A-E) hale geldi.`;

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
  } else {
    const turns = req.messages ?? [];
    if (turns.length === 0) throw new Error('chat modu için mesaj gerekli');
    if (req.question) {
      // Soru bağlamını sistem talimatına iliştir: her turda tekrar göndermeye gerek kalmaz
      systemInstruction = `${SYSTEM}\n\nÖğrenci şu soru üzerinde çalışıyor:\n${questionContext(req.question)}`;
    }
    contents = turns.slice(-12).map((t) => ({ role: t.role, parts: [{ text: t.text }] }));
  }

  const result = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: { systemInstruction, temperature: 0.3, maxOutputTokens: 1800 },
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
