/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

/**
 * Yerel geliştirmede /api/ai-hoca endpoint'i — Netlify Function'ın birebir eşi.
 * Kimlik bilgileri .env.local'dan okunur, istemciye asla sızmaz.
 */
function aiHocaDev(env: Record<string, string>): Plugin {
  return {
    name: 'ai-hoca-dev',
    configureServer(server) {
      server.middlewares.use('/api/ai-hoca', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Yalnızca POST' }));
          return;
        }
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json');
          try {
            const { generateExplanation } = await import('./server/aiHoca');
            const text = await generateExplanation(JSON.parse(body), {
              GOOGLE_CLOUD_PROJECT: env.GOOGLE_CLOUD_PROJECT,
              GOOGLE_CLOUD_LOCATION: env.GOOGLE_CLOUD_LOCATION,
              GOOGLE_CREDENTIALS_JSON: env.GOOGLE_CREDENTIALS_JSON,
            });
            res.end(JSON.stringify({ text }));
          } catch (e) {
            console.error('[ai-hoca dev]', e);
            res.statusCode = 502;
            res.end(JSON.stringify({ error: 'AI Hoca şu an yanıt veremiyor' }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({ registerType: 'autoUpdate', manifest: false }),
      aiHocaDev(env),
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'server/**/*.test.ts'],
    },
  };
});
