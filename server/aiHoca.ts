/**
 * AI Hoca — Vertex AI (Gemini) ile detaylı soru açıklaması.
 * Hem Netlify Function'dan hem Vite dev middleware'inden kullanılır.
 * Kimlik bilgileri YALNIZCA sunucu tarafında (env) yaşar.
 */
import { GoogleGenAI } from '@google/genai';

export interface AiHocaPayload {
  stem: string;
  choices: { id: string; text: string }[];
  correct: string;
  selected?: string;
  topicTitle: string;
  subtopic?: string;
}

export interface AiHocaEnv {
  GOOGLE_CLOUD_PROJECT?: string;
  GOOGLE_CLOUD_LOCATION?: string;
  GOOGLE_CREDENTIALS_JSON?: string;
}

const MODEL = 'gemini-2.5-flash';

const SYSTEM = `Sen Türkiye'deki Turist Rehberliği Mesleğe Kabul Sınavı (MKS) için öğrenci çalıştıran,
alanına hâkim ve samimi bir hocasın. Öğrencin sınava haftalar kala yoğun çalışıyor.
Cevapların Türkçe, net ve sınav odaklı olsun. Markdown kullan ama başlıkları kısa tut.

DOĞRULUK KURALLARI (en önemli bölüm):
- YALNIZCA yüzde yüz emin olduğun, ders kitabı düzeyinde yerleşik olguları yaz.
- Bir tarihten, isimden veya sayıdan emin değilsen o detayı HİÇ yazma; tahmin etme,
  "yaklaşık/civarı" diyerek de geçiştirme.
- Türev soru üretirken her türevin cevabı tartışmasız tek ve doğrulanabilir olmalı;
  emin olamadığın türevi listeye koyma. Az ama kesin bilgi > çok ama şüpheli bilgi.`;

export function buildPrompt(p: AiHocaPayload): string {
  const choiceLines = p.choices.map((c) => `${c.id}) ${c.text}`).join('\n');
  const selectedLine =
    p.selected && p.selected !== p.correct
      ? `Öğrenci ${p.selected} şıkkını seçti (yanlış). Önce bu hatanın mantığını nazikçe çöz.`
      : 'Öğrenci doğru cevabı bulmuş; pekiştirmek istiyor.';

  return `Konu: ${p.topicTitle}${p.subtopic ? ` — ${p.subtopic}` : ''}

Soru: ${p.stem}
${choiceLines}
Doğru cevap: ${p.correct}
${selectedLine}

Şu yapıda anlat:
### Neden ${p.correct}?
(2-4 cümle, olgusal derinlik)
### Çeldiriciler neden yanlış?
(her şık için tek cümle)
### Aklında kalsın
(bir ezber tekniği / kanca)
### Bu sorunun türevleri
(Aynı konudan sınavda GELEBİLECEK 3-4 türev soruyu "Soru → Cevap" biçiminde yaz.
Örnek biçim: "• Selimiye Camii'nin mimarı kimdir? → Mimar Sinan (ustalık eseri)".
Yalnızca kesin bildiğin türevleri yaz; şüphelendiğini atla.)
### Bunu da bil
(aynı konudan 2-3 bağlantılı kesin olgu, madde madde)`;
}

export async function generateExplanation(payload: AiHocaPayload, env: AiHocaEnv): Promise<string> {
  if (!env.GOOGLE_CLOUD_PROJECT || !env.GOOGLE_CREDENTIALS_JSON) {
    throw new Error('Vertex AI yapılandırması eksik (GOOGLE_CLOUD_PROJECT / GOOGLE_CREDENTIALS_JSON)');
  }

  const ai = new GoogleGenAI({
    vertexai: true,
    project: env.GOOGLE_CLOUD_PROJECT,
    location: env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    googleAuthOptions: { credentials: JSON.parse(env.GOOGLE_CREDENTIALS_JSON) },
  });

  const result = await ai.models.generateContent({
    model: MODEL,
    contents: buildPrompt(payload),
    config: {
      systemInstruction: SYSTEM,
      temperature: 0.3,
      maxOutputTokens: 1800,
    },
  });

  const text = result.text?.trim();
  if (!text) throw new Error('Modelden boş yanıt geldi');
  return text;
}
