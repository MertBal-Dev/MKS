import { runAiHoca, type AiHocaRequest } from '../../server/aiHoca';

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Yalnızca POST' }, { status: 405 });
  }

  let body: AiHocaRequest;
  try {
    body = (await req.json()) as AiHocaRequest;
    if (!body || (!body.question && !body.messages?.length)) throw new Error('eksik alan');
  } catch {
    return Response.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 });
  }

  try {
    const text = await runAiHoca(body, {
      GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
      GOOGLE_CLOUD_LOCATION: process.env.GOOGLE_CLOUD_LOCATION,
      GOOGLE_CREDENTIALS_JSON: process.env.GOOGLE_CREDENTIALS_JSON,
    });
    return Response.json({ text });
  } catch (e) {
    console.error('[ai-hoca]', e);
    return Response.json({ error: 'AI Hoca şu an yanıt veremiyor' }, { status: 502 });
  }
};

export const config = { path: '/api/ai-hoca' };
