// Vercel Serverless Function — /api/ai-hoca
// Kimlik bilgileri yalnızca Vercel ortam değişkenlerinde yaşar.
import { generateExplanation, type AiHocaPayload } from '../server/aiHoca';

// Vercel Node runtime: req.body JSON otomatik ayrıştırılır.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Yalnızca POST' });
    return;
  }

  const payload = req.body as AiHocaPayload | undefined;
  if (!payload?.stem || !Array.isArray(payload.choices) || !payload.correct) {
    res.status(400).json({ error: 'Geçersiz istek gövdesi' });
    return;
  }

  try {
    const text = await generateExplanation(payload, {
      GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
      GOOGLE_CLOUD_LOCATION: process.env.GOOGLE_CLOUD_LOCATION,
      GOOGLE_CREDENTIALS_JSON: process.env.GOOGLE_CREDENTIALS_JSON,
    });
    res.status(200).json({ text });
  } catch (e) {
    console.error('[ai-hoca vercel]', e);
    res.status(502).json({ error: 'AI Hoca şu an yanıt veremiyor' });
  }
}
