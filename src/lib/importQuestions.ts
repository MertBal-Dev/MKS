import { CustomQuestionSchema, type CustomQuestion } from './customSets';

/**
 * Yüklenen belgeyi AI'ya verilebilir hâle getirir.
 *
 * PDF ve görseller modele OLDUĞU GİBİ gönderilir — Gemini bunları kendisi
 * okur, böylece taranmış/fotoğraflanmış sorular da çalışır ve tarayıcıya
 * megabaytlarca PDF ayrıştırıcı yüklemek gerekmez.
 * Word yalnızca istemcide metne çevrilebildiği için mammoth kullanılır
 * ve o da ancak dosya seçildiğinde indirilir.
 */

export const KABUL_EDILEN =
  '.pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.webp,application/pdf,image/*';

/** Tek istekte gönderilebilecek üst sınır; üstünde model isteği reddediyor. */
const MAX_BAYT = 15 * 1024 * 1024;

export interface Kaynak {
  text?: string;
  document?: { mimeType: string; data: string };
  /** Kullanıcıya gösterilecek kaynak adı. */
  ad: string;
}

function base64Of(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  // Büyük dosyalarda tek seferde spread yığını taşırır; parça parça çevir.
  const ADIM = 0x8000;
  for (let i = 0; i < bytes.length; i += ADIM) {
    bin += String.fromCharCode(...bytes.subarray(i, i + ADIM));
  }
  return btoa(bin);
}

export async function dosyadanKaynak(file: File): Promise<Kaynak> {
  if (file.size > MAX_BAYT) {
    throw new Error(
      `Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(1)} MB). En fazla 15 MB yükleyebilirsin; belgeyi bölmeyi dene.`,
    );
  }

  const ad = file.name;
  const uzanti = ad.toLowerCase().split('.').pop() ?? '';

  if (file.type === 'application/pdf' || uzanti === 'pdf') {
    return { document: { mimeType: 'application/pdf', data: base64Of(await file.arrayBuffer()) }, ad };
  }

  if (file.type.startsWith('image/')) {
    return { document: { mimeType: file.type, data: base64Of(await file.arrayBuffer()) }, ad };
  }

  if (uzanti === 'docx') {
    // Yalnızca gerektiğinde indirilir — ana pakete girmez.
    // Tip tanımı src/types/mammoth-browser.d.ts içinde.
    const mammoth = await import('mammoth/mammoth.browser.js');
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    if (!value.trim()) throw new Error('Word dosyasından metin çıkarılamadı. Dosya boş veya yalnızca görsel içeriyor olabilir.');
    return { text: value, ad };
  }

  if (uzanti === 'doc') {
    throw new Error('Eski .doc biçimi okunamıyor. Word\'de "Farklı Kaydet" ile .docx veya PDF olarak kaydedip tekrar dene.');
  }

  // txt, md ve diğer düz metinler
  const text = await file.text();
  if (!text.trim()) throw new Error('Dosya boş görünüyor.');
  return { text, ad };
}

/** Uzun metni modele sığacak parçalara böler; soru sınırlarını korumaya çalışır. */
export function parcala(text: string, hedef = 6000): string[] {
  if (text.length <= hedef) return [text];

  const parcalar: string[] = [];
  const satirlar = text.split('\n');
  let birikim = '';

  for (const satir of satirlar) {
    if (birikim.length + satir.length + 1 > hedef && birikim.trim()) {
      parcalar.push(birikim);
      birikim = '';
    }
    birikim += `${satir}\n`;
  }
  if (birikim.trim()) parcalar.push(birikim);
  return parcalar;
}

/** Model bazen JSON'u kod bloğuna sarar ya da başına açıklama ekler; diziyi kurtar. */
function jsonDiziCikar(raw: string): unknown[] {
  const temiz = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    const v = JSON.parse(temiz);
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') {
      // {"questions": [...]} gibi sarmalanmış biçimler
      for (const deger of Object.values(v as Record<string, unknown>)) {
        if (Array.isArray(deger)) return deger;
      }
    }
  } catch {
    /* aşağıda kaba yöntemle denenecek */
  }

  const bas = temiz.indexOf('[');
  const son = temiz.lastIndexOf(']');
  if (bas >= 0 && son > bas) {
    try {
      const v = JSON.parse(temiz.slice(bas, son + 1));
      if (Array.isArray(v)) return v;
    } catch {
      /* kurtarılamadı */
    }
  }
  return [];
}

const HARFLER = ['A', 'B', 'C', 'D', 'E'] as const;

/** Modelden gelen ham nesneyi doğrular ve normalleştirir; bozuk kayıtları atar. */
export function normalize(ham: unknown[], idOneki: string): CustomQuestion[] {
  const cikti: CustomQuestion[] = [];

  ham.forEach((item, i) => {
    if (!item || typeof item !== 'object') return;
    const o = item as Record<string, unknown>;

    const secenekler = Array.isArray(o.choices) ? o.choices : [];
    // Şıkları sırayla yeniden harflendir: model bazen harfleri atlıyor veya karıştırıyor.
    const choices = secenekler
      .map((c) => {
        const cc = c as Record<string, unknown>;
        const metin = typeof cc?.text === 'string' ? cc.text.trim() : '';
        return metin ? { id: String(cc?.id ?? '').trim().toUpperCase(), text: metin } : null;
      })
      .filter((c): c is { id: string; text: string } => c !== null)
      .slice(0, 5);

    if (choices.length < 2) return;

    const eskiDogru = String(o.correct ?? '').trim().toUpperCase();
    const dogruIndex = choices.findIndex((c) => c.id === eskiDogru);
    const yeni = choices.map((c, k) => ({ id: HARFLER[k], text: c.text }));
    const correct = HARFLER[dogruIndex >= 0 ? dogruIndex : 0];

    const aday = {
      id: `${idOneki}-${i + 1}`,
      stem: typeof o.stem === 'string' ? o.stem.trim() : '',
      choices: yeni,
      correct,
      explanation: typeof o.explanation === 'string' ? o.explanation.trim() : '',
      answerSource: o.answerSource === 'belge' ? 'belge' : 'ai',
      // Doğru şık eşleşmediyse model kendiyle çelişmiş demektir; belirsiz say.
      confidence: dogruIndex < 0 || o.confidence === 'belirsiz' ? 'belirsiz' : 'kesin',
      topicId: typeof o.topicId === 'string' ? o.topicId : undefined,
      difficulty: o.difficulty === 1 || o.difficulty === 3 ? o.difficulty : 2,
    };

    if (!aday.stem) return;

    const sonuc = CustomQuestionSchema.safeParse(aday);
    if (sonuc.success) cikti.push(sonuc.data);
    else {
      // topicId listede yoksa sorunun tamamını atmak yerine alanı düşür.
      const sonuc2 = CustomQuestionSchema.safeParse({ ...aday, topicId: undefined });
      if (sonuc2.success) cikti.push(sonuc2.data);
    }
  });

  return cikti;
}

export { jsonDiziCikar };
