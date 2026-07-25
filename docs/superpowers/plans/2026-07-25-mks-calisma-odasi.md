# MKS Çalışma Odası Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tek kullanıcılık, premium, mobil öncelikli, çevrimdışı çalışan MKS sınav hazırlık PWA'sı — konu anlatımları, açıklamalı soru bankası, çıkmış sorular, deneme simülasyonu, akıllı tekrar, istatistik ve sprint planı ile.

**Architecture:** Vite + React + TypeScript statik SPA. İçerik, koddan ayrı JSON paketlerinde (`src/content/`); ilerleme localStorage'da sürümlü şemayla; tüm veri erişimi tek repo modülü (`src/lib/storage.ts`) arkasında. PWA (vite-plugin-pwa) ile tam çevrimdışı.

**Tech Stack:** Vite 6, React 18, TypeScript (strict), react-router-dom v7, Tailwind CSS v4 (@tailwindcss/vite), zod, vitest, react-markdown + remark-gfm, lucide-react, @fontsource-variable/fraunces + @fontsource-variable/inter, vite-plugin-pwa.

## Global Constraints

- Tüm UI metinleri **Türkçe**. Tarih/saat formatı Türkçe (`tr-TR`).
- Soru formatı: **tam 4 şık (A-D)**, tek doğru — gerçek sınavla birebir (Şubat 2025 derlemesiyle doğrulandı).
- Deneme simülasyonu: **100 soru / 120 dakika / baraj 70**; puan = (doğru/toplam)×100; yanlış götürmez.
- Geri sayım hedefi: **2026-08-29T10:00:00+03:00** (MKS-4). Tek yerde sabit: `src/lib/constants.ts` → `EXAM_DATE`.
- 12 resmi konu bloğu; `TopicId` birliği (union) Task 2'de tanımlanır, her yerde o kullanılır.
- Çalışma zamanında **hiçbir dış ağ isteği yok** (fontlar self-hosted, tüm içerik bundle'da) — PWA çevrimdışı tam çalışır.
- localStorage anahtarı: `mks:v1`. Şema sürümlü; dışa/içe aktarma aynı JSON şeması.
- Her içerik dosyası `npm run validate:content` doğrulayıcısından geçmeden commit edilmez.
- Commit mesajları İngilizce conventional-commit (`feat:`, `content:`, `test:`, `chore:`); her commit sonunda `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## File Structure

```
mks-calisma-odasi/
├── index.html
├── package.json / tsconfig.json / vite.config.ts
├── public/ (pwa ikonları)
├── icerik-gelen-kutusu/README.md        # kullanıcının PDF/not bırakma klasörü
├── scripts/validate-content.ts          # içerik doğrulayıcı
└── src/
    ├── main.tsx / App.tsx / index.css   # giriş + router + tema tokenları
    ├── lib/
    │   ├── constants.ts                 # EXAM_DATE, TOPICS meta, rozet eşikleri
    │   ├── types.ts                     # Question, Topic, Exam, AppState... (zod'dan türetilmiş)
    │   ├── schemas.ts                   # zod şemaları (içerik + AppState)
    │   ├── storage.ts                   # localStorage repo, migrate, export/import
    │   ├── scoring.ts                   # puan, konu kırılımı, tahmini puan
    │   ├── srs.ts                       # Leitner kutuları
    │   ├── wrongPool.ts                 # yanlış havuzu kuralları
    │   ├── streak.ts                    # çalışma serisi
    │   └── planner.ts                   # sprint planı üretici
    ├── content/
    │   ├── index.ts                     # tüm içerik paketlerinin kayıt noktası
    │   ├── topics/<topicId>.json        # anlatım katmanları + tuzaklar + kartlar
    │   ├── questions/<topicId>.json     # soru bankası (konu başına)
    │   └── exams/<examId>.json          # denemeler + çıkmış derlemeler
    ├── components/                      # AppShell, QuestionCard, ProgressRing, Countdown,
    │   ...                              # ChoiceButton, TopicBadge, StatChart, Flashcard...
    ├── pages/                           # Dashboard, Konular, KonuDetay, SoruBankasi,
    │   ...                              # Pratik, Denemeler, SinavOdasi, SinavSonuc,
    │                                    # Tekrar, YanlisHavuzu, Istatistik, Plan, Ayarlar
    └── hooks/                           # useAppState, useExamSession, useCountdown
```

Content JSON'ları uygulama kodundan bağımsızdır; `src/content/index.ts` tek kayıt noktasıdır — içerik ekleme = JSON dosyası + index'e bir satır.

---

## Faz 1 — İskelet ve Temel Katmanlar

### Task 1: Proje iskeleti

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `.gitignore`, `icerik-gelen-kutusu/README.md`

**Interfaces:**
- Produces: çalışan dev sunucusu, `npm test` (vitest), `npm run build`, Tailwind v4 + fontlar hazır.

- [ ] **Step 1: Node kontrolü** — `node -v` (≥ 20 bekle). Yoksa: `winget install OpenJS.NodeJS.LTS` ve yeni terminal.
- [ ] **Step 2: Scaffold** — repo kökünde (`c:\Users\Gaming\Desktop\MKS`):

```powershell
npm create vite@latest . -- --template react-ts
npm i react-router-dom zod react-markdown remark-gfm lucide-react
npm i -D vitest @tailwindcss/vite tailwindcss vite-plugin-pwa tsx @types/node
npm i @fontsource-variable/fraunces @fontsource-variable/inter
```

(Not: mevcut `docs/` ve `.git` korunur; scaffold "ignore files and continue" seçeneğiyle kurulur.)

- [ ] **Step 3: vite.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({ registerType: 'autoUpdate', manifest: false })],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
```

`tsconfig.app.json` → `"baseUrl": ".", "paths": { "@/*": ["src/*"] }`. `package.json` scripts: `"test": "vitest run"`, `"validate:content": "tsx scripts/validate-content.ts"`.

- [ ] **Step 4: index.css** — Tailwind v4 + font importları (`@import "tailwindcss"; @import "@fontsource-variable/inter"; @import "@fontsource-variable/fraunces";`) + `<html lang="tr">`, `<title>MKS Çalışma Odası</title>`.
- [ ] **Step 5: Doğrula** — `npm run dev` açılıyor, `npm run build` temiz. `icerik-gelen-kutusu/README.md`: "Bu klasöre attığın PDF/notları bir sonraki oturumda Claude içeriğe işler."
- [ ] **Step 6: Commit** — `chore: scaffold Vite+React+TS app with Tailwind v4, PWA and fonts`

### Task 2: İçerik şemaları + doğrulayıcı

**Files:**
- Create: `src/lib/schemas.ts`, `src/lib/types.ts`, `src/lib/constants.ts`, `scripts/validate-content.ts`, `src/content/index.ts`
- Test: `src/lib/schemas.test.ts`

**Interfaces (Produces — sonraki TÜM görevler bunları kullanır):**

```ts
// constants.ts
export const EXAM_DATE = new Date('2026-08-29T10:00:00+03:00');
export const PASS_SCORE = 70;
export const EXAM_QUESTION_COUNT = 100;
export const EXAM_DURATION_MIN = 120;
export type TopicId =
  | 'genel-turizm' | 'turizm-cografyasi' | 'genel-turk-tarihi' | 'osmanli-tarihi'
  | 'arkeoloji-mitoloji' | 'roma-yunan-bizans' | 'sanat-tarihi' | 'dinler-tarihi'
  | 'ilk-yardim' | 'anadolu-medeniyetleri' | 'halk-bilimi-edebiyat' | 'muzecilik';
export const TOPICS: Record<TopicId, { title: string; short: string; order: number; examWeight: number }>;
// examWeight toplamı = 100: genel-turizm 10, turizm-cografyasi 10, genel-turk-tarihi 8,
// osmanli-tarihi 8, arkeoloji-mitoloji 12, roma-yunan-bizans 10, sanat-tarihi 10,
// dinler-tarihi 6, ilk-yardim 4, anadolu-medeniyetleri 12, halk-bilimi-edebiyat 6, muzecilik 4
```

```ts
// schemas.ts (zod) → types.ts (z.infer ile dışa aktarım)
ChoiceId = 'A'|'B'|'C'|'D'
Question = { id: string /* `${topicId}-\d{3}` */, topicId: TopicId, subtopic: string,
  difficulty: 1|2|3, stem: string, choices: [{ id, text, explanation }] /* tam 4, A-D sıralı */,
  correct: ChoiceId, trick?: string }
Flashcard = { id: string, front: string, back: string }
Topic = { id: TopicId, fullNotes: { heading: string, markdown: string }[] /* ≥3 bölüm */,
  shortNotes: string, tricks: string[] /* ≥5 */, flashcards: Flashcard[] /* ≥20 */ }
Exam = { id: string, title: string, kind: 'deneme'|'cikmis', note?: string,
  questions: Question[] /* deneme: tam 100; cikmis: ≥50 */ }
```

- [ ] **Step 1: Failing test** — `schemas.test.ts`: geçerli soru parse olur; 3 şıklı, çift doğru id'li, açıklamasız şık, yanlış topicId, kopya id durumları reject. `TOPICS` examWeight toplamı 100.
- [ ] **Step 2:** `npx vitest run src/lib/schemas.test.ts` → FAIL.
- [ ] **Step 3:** `schemas.ts` + `constants.ts` + `types.ts` implementasyonu. `content/index.ts` başlangıçta boş kayıtlarla: `export const topics: Topic[] = []; export const questionBank: Question[] = []; export const exams: Exam[] = [];`
- [ ] **Step 4:** Test PASS.
- [ ] **Step 5: validate-content.ts** — `src/content/` altındaki tüm JSON'ları zod'la parse eder; ek kurallar: global benzersiz question/flashcard id; her deneme tam 100 soru; her sorunun 4 şıkkında da `explanation` dolu; hata varsa `process.exit(1)` + okunur rapor. `npm run validate:content` boş içerikle yeşil.
- [ ] **Step 6: Commit** — `feat: content schemas, topic registry and content validator`

### Task 3: Depolama katmanı (localStorage repo)

**Files:**
- Create: `src/lib/storage.ts`  — Test: `src/lib/storage.test.ts`

**Interfaces (Produces):**

```ts
export interface AppState {
  version: 1;
  settings: { theme: 'dark'|'light'|'system' };
  attempts: Record<string, { correct: number; wrong: number; lastResult: 'correct'|'wrong'; lastAt: string }>;
  wrongPool: Record<string, { addedAt: string; consecutiveCorrect: number }>;
  srs: Record<string, { box: 1|2|3|4|5; dueAt: string }>;
  examResults: { examId: string; finishedAt: string; score: number; correct: number; wrong: number;
                 blank: number; byTopic: Record<string, { correct: number; total: number }>;
                 answers: Record<string, 'A'|'B'|'C'|'D'> }[];
  planProgress: Record<string, boolean>;   // 'gun-2026-08-01' → true
  streak: { lastStudyDay: string; current: number; best: number };
}
export function loadState(): AppState;              // yoksa DEFAULT_STATE
export function saveState(s: AppState): void;
export function updateState(fn: (s: AppState) => AppState): AppState;
export function exportState(): string;              // JSON string
export function importState(json: string): AppState; // zod doğrulamalı, hatada throw
```

- [ ] **Step 1: Failing test** — boş storage → DEFAULT_STATE; save/load simetrik; importState bozuk JSON ve yanlış şemada throw; updateState kalıcı. (Testte `globalThis.localStorage` yerine enjekte edilebilir basit Map tabanlı stub: `storage.ts` içinde `const store = () => globalThis.localStorage` — testler `globalThis.localStorage`'a in-memory polyfill atar.)
- [ ] **Step 2:** FAIL doğrula. **Step 3:** implement. **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat: versioned localStorage repository with export/import`

### Task 4: Puanlama motoru

**Files:** Create: `src/lib/scoring.ts` — Test: `src/lib/scoring.test.ts`

**Interfaces (Produces):**

```ts
export function computeScore(correct: number, total: number): number; // (c/t)*100, 2 ondalık
export function gradeExam(exam: Exam, answers: Record<string, ChoiceId|undefined>): AppState['examResults'][number];
export function topicAccuracy(attempts: AppState['attempts'], bank: Question[]): Record<TopicId, { correct: number; total: number; pct: number|null }>;
export function estimateScore(acc: ReturnType<typeof topicAccuracy>): number|null;
// estimateScore: Σ(examWeight_t × pct_t/100); verisi olmayan konular hesaba katılmaz,
// hiç veri yoksa null. Sonuç 0-100, 1 ondalık.
```

- [ ] **Step 1: Failing test** — computeScore(70,100)=70; gradeExam boş cevapları `blank` sayar, byTopic doğru kırar, 100 soruluk sahte sınavda score=doğru sayısı; estimateScore ağırlıklı ortalama + null durumları.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS. **Step 5: Commit** — `feat: scoring engine with topic breakdown and score estimate`

### Task 5: SRS + yanlış havuzu + streak

**Files:** Create: `src/lib/srs.ts`, `src/lib/wrongPool.ts`, `src/lib/streak.ts` — Test: her biri için `.test.ts`

**Interfaces (Produces):**

```ts
// srs.ts — Leitner: kutu aralıkları gün cinsinden [1:0, 2:1, 3:2, 4:4, 5:7]
export function reviewCard(card: { box: 1|2|3|4|5; dueAt: string }, result: 'correct'|'wrong', now: Date):
  { box: 1|2|3|4|5; dueAt: string }; // correct→min(box+1,5), wrong→1; dueAt = now + interval[yeniKutu]
export function dueCards(srs: AppState['srs'], now: Date): string[]; // dueAt <= now olan id'ler
// wrongPool.ts
export function recordAnswer(pool: AppState['wrongPool'], qId: string, result: 'correct'|'wrong', now: Date): AppState['wrongPool'];
// wrong → ekle/consecutive sıfırla; correct → varsa consecutiveCorrect+1, 2'ye ulaşınca havuzdan çıkar
// streak.ts
export function bumpStreak(s: AppState['streak'], today: string /* 'YYYY-MM-DD' */): AppState['streak'];
// aynı gün → değişmez; dün → current+1; boşluk → current=1; best güncellenir
```

- [ ] **Step 1: Failing tests** (3 dosya, tablolu vakalar: kutu yükselme/sıfırlanma, due hesabı, havuzdan 2 üst üste doğruyla çıkış, streak dün/boşluk/aynı gün/best).
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS. **Step 5: Commit** — `feat: leitner SRS, wrong-answer pool and streak engines`

### Task 6: Sprint planı üretici

**Files:** Create: `src/lib/planner.ts` — Test: `src/lib/planner.test.ts`

**Interfaces (Produces):**

```ts
export interface PlanDay { id: string; date: string; label: string; // '1. Hafta • Çarşamba'
  focusTopics: TopicId[]; goals: { kind: 'reading'|'questions'|'review'|'exam'; label: string; count?: number }[]; }
export function generatePlan(start: Date, examDate: Date): PlanDay[];
```

Kurallar: gün sayısına 12 konu, examWeight'e orantılı gün ağırlığıyla dağıtılır (yüksek ağırlık = daha çok gün); her gün 1-2 odak konu + hedefler (`reading` konu anlatımı, `questions` 30-40 soru, `review` SRS); her Pazar `exam` (deneme/çıkmış çözümü); son 3 gün "genel tekrar + tuzak listeleri + kısa anlatımlar"; sınav önceki gün hafif tekrar. Deterministik (aynı girdi → aynı plan).

- [ ] **Step 1: Failing test** — 25 Tem→29 Ağu: tüm günler kapsanır, her konu ≥2 gün odakta, Pazarlar exam içerir, son gün hafif, determinizm.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS. **Step 5: Commit** — `feat: sprint plan generator`

---

## Faz 2 — Tasarım Sistemi ve UI

> Faz 2 görevlerine başlamadan önce: **`frontend-design` skill'i yüklenecek** ve `ui-ux-pro-max` skill'inden palet/tipografi kontrolü yapılacak. Aşağıdaki token seti temel; skill çıktısıyla zenginleştirilir.

### Task 7: Tasarım tokenları + AppShell

**Files:**
- Create: `src/index.css` (tokenlar), `src/components/AppShell.tsx`, `src/components/Countdown.tsx`, `src/hooks/useAppState.tsx`, `src/App.tsx` (router)

**Tasarım dili:** "Anadolu gece kütüphanesi" — koyu tema varsayılan: zemin `#12100E` (sıcak siyah), yüzey `#1C1917`, metin `#F5EFE6` (fildişi); vurgular: terracotta `#C65D3B`, altın `#D9A441`, derin lacivert `#1B3A5B`, yeşim `#3E7C59` (doğru), kiremit kırmızı `#B3402E` (yanlış). Açık tema: fildişi zemin `#FAF6EF`, mürekkep metin `#2A2119`. Display: Fraunces Variable (başlıklar, sayaçlar); metin: Inter Variable. Radius 16px kartlar; yumuşak, kısa (150-250ms) geçişler; `prefers-reduced-motion` saygısı.

**Interfaces (Produces):**
- `useAppState()` → `{ state, update }` (context; `update(fn)` → storage.updateState + re-render).
- `AppShell`: mobilde alt sekme çubuğu (5 sekme: Ana Sayfa, Konular, Sorular, Tekrar, Daha▾), ≥1024px'te sol yan panel (10 kayıt); aktif rota vurgusu; safe-area padding.
- `Countdown`: EXAM_DATE'e gün/saat/dakika; gün <7 ise vurgu rengi terracotta→kırmızı.
- Router rotaları: `/`, `/konular`, `/konular/:topicId`, `/soru-bankasi`, `/pratik`, `/denemeler`, `/sinav/:examId`, `/sinav/:examId/sonuc`, `/tekrar`, `/yanlis-havuzu`, `/istatistik`, `/plan`, `/ayarlar`.

- [ ] **Step 1:** Tokenları `@theme` bloğuyla index.css'e yaz (dark varsayılan, `[data-theme="light"]` override); tema `settings.theme`'den `document.documentElement`'e uygulanır.
- [ ] **Step 2:** AppShell + Countdown + boş sayfa bileşenleriyle router; mobil görünüm (390px) ve masaüstünde elle doğrula (`npm run dev`).
- [ ] **Step 3:** `npm run build` temiz. **Commit** — `feat: design tokens, app shell with bottom-tab/sidebar nav and countdown`

### Task 8: Ana Panel (Dashboard)

**Files:** Create: `src/pages/Dashboard.tsx`, `src/components/ProgressRing.tsx`, `src/components/TodayCard.tsx`

Davranış: (1) Countdown hero — Fraunces ile büyük gün sayacı + "MKS-4 • 29 Ağustos 2026, 10:00"; (2) "Bugünün Planı" kartı — `generatePlan`'dan bugünün `PlanDay`'i, hedefler tamamlanma kutucuklarıyla (`planProgress`); (3) konu ilerleme halkaları (12 konu; doluluk = o konuda çözülen benzersiz soru / konudaki soru sayısı); (4) streak alevi + `estimateScore` "Tahmini Puanın: 74,5" (veri yoksa "Soru çözdükçe burada tahmini puanını göreceksin"); (5) hızlı aksiyonlar: "10 Soru Çöz" (`/pratik?mode=quick`), "Kartları Tekrarla" (`/tekrar`), "Denemeye Gir" (`/denemeler`).

- [ ] **Step 1:** Bileşenleri implement et (ProgressRing: SVG stroke-dasharray; animasyonlu dolum).
- [ ] **Step 2:** Elle doğrula (boş state + sahte state). **Step 3: Commit** — `feat: dashboard with countdown, daily plan, progress rings and quick actions`

### Task 9: Konular + Konu Detay

**Files:** Create: `src/pages/Konular.tsx`, `src/pages/KonuDetay.tsx`, `src/components/MarkdownView.tsx`

Davranış: Konular — 12 kart (başlık, ilerleme halkası, soru sayısı, "tuzak" rozeti). KonuDetay — sekmeler: **Anlatım** (fullNotes bölümleri, akordeon başlıklar), **Kısa Anlatım** (shortNotes — sınav öncesi okuma modu: büyük punto), **Tuzaklar** (tricks listesi — her madde ⚠ kartı), **Kartlar** (konunun flashcard'ları — çevirmeli), **Mini Test** (`/pratik?topic=<id>&count=10`). MarkdownView: react-markdown + remark-gfm; tablo/liste/bold stilleri token uyumlu.

- [ ] **Step 1:** Implement + boş içerikte zarif "yakında" durumu.
- [ ] **Step 2:** Elle doğrula (Task 16'daki ilk gerçek içerik gelince yeniden bakılacak). **Commit** — `feat: topic list and detail pages with notes/short/tricks/cards tabs`

### Task 10: Soru çözme motoru (pratik modu) + Soru Bankası

**Files:** Create: `src/components/QuestionPlayer.tsx`, `src/components/ChoiceButton.tsx`, `src/pages/SoruBankasi.tsx`, `src/pages/Pratik.tsx`

**Interfaces (Produces):** `QuestionPlayer({ questions, mode: 'practice'|'exam', onAnswer(qId, choice, isCorrect), onFinish(answers) })`
- practice: şık seçince anında geri bildirim — doğruysa yeşim vurgu + kısa konfeti-siz zarif animasyon; yanlışsa doğru şık işaretlenir; **tüm şıkların açıklamaları** açılır; `trick` varsa ⚠ kutusu; "Sonraki" ile ilerler.
- exam: geri bildirim YOK; işaretle/geç; soru haritası; cevaplar `onFinish`'e.
- Her cevapta (practice): `attempts` güncelle, `recordAnswer` (wrongPool), `bumpStreak`.

SoruBankasi: konu/zorluk/durum (hiç çözülmemiş • yanlış yaptıklarım • işaretlediklerim) filtreleri + "Başlat" → Pratik. Pratik: query paramlarına göre soru seti kurar (`mode=quick`: tüm bankadan 10 rastgele, az çözülmüş öncelikli).

- [ ] **Step 1: Failing test** — soru seti kurucu saf fonksiyon `buildPracticeSet(bank, attempts, filters)` için: filtre doğruluğu, quick modda az-çözülmüş önceliği, istenen adet. (`src/lib/practiceSet.ts` + test.)
- [ ] **Step 2:** FAIL → implement → PASS.
- [ ] **Step 3:** UI implement; elle doğrula (sahte 5 soruluk JSON ile). **Commit** — `feat: question player with per-choice explanations, question bank filters`

### Task 11: Deneme simülasyonu + sonuç ekranı

**Files:** Create: `src/pages/Denemeler.tsx`, `src/pages/SinavOdasi.tsx`, `src/pages/SinavSonuc.tsx`, `src/hooks/useExamSession.ts`

Davranış: Denemeler — deneme + çıkmış listesi (kind rozetiyle), geçmiş sonuçlar. SinavOdasi — tam ekran mod: üstte kalan süre çubuğu (120dk; son 10dk terracotta), soru haritası (100 hücre: boş/cevaplı/işaretli), QuestionPlayer `exam` modunda; "Sınavı Bitir" onay diyaloğu; süre bitince otomatik teslim. Oturum `sessionStorage`'da sürer (yenilemede kaybolmaz). SinavSonuc — büyük puan (Fraunces), 70 barajına göre mesaj ("Geçtin! 🎉" / "Barajın X puan altında — birlikte kapatacağız"), konu kırılım çubukları, yanlışların listesi → her biri açıklamalı çözüm; sonuç `examResults`'a yazılır, yanlışlar wrongPool'a işlenir.

- [ ] **Step 1: Failing test** — `useExamSession` çekirdeği saf fonksiyonlarla (`src/lib/examSession.ts`): kalan süre hesabı, otomatik teslim eşiği, sessionStorage state (in-memory stub) kurtarma.
- [ ] **Step 2:** FAIL → implement → PASS. **Step 3:** UI implement + elle doğrula. **Commit** — `feat: exam simulation with timer, question map and result analysis`

### Task 12: Akıllı Tekrar (SRS) + Yanlış Havuzu UI

**Files:** Create: `src/pages/Tekrar.tsx`, `src/pages/YanlisHavuzu.tsx`, `src/components/Flashcard.tsx`

Davranış: Tekrar — bugün due kartlar (dueCards); 3D flip kart (front→back); "Bildim / Bilemedim" → reviewCard; oturum sonu özeti ("14 kart, 11 bildin"); due yoksa "Bugünlük tamam 🎉 — yarın X kart seni bekliyor". Yanlış yapılan her soru otomatik flashcard'a dönüşür (soru stem'i front, doğru şık + tek cümle açıklama back; id `q-<questionId>`). YanlisHavuzu — havuzdaki sorular listesi (konu rozetli); "Tekrar Çöz" → practice modunda sadece havuz soruları; consecutiveCorrect göstergesi (0/2, 1/2).

- [ ] **Step 1:** `src/lib/autoCards.ts` — `wrongToCard(q: Question): Flashcard` + testi (FAIL→PASS).
- [ ] **Step 2:** UI implement + elle doğrula. **Commit** — `feat: spaced-repetition review and wrong-answer pool pages`

### Task 13: İstatistik sayfası

**Files:** Create: `src/pages/Istatistik.tsx`, `src/components/charts/BarRow.tsx`, `src/components/charts/LineChart.tsx` (saf SVG, bağımlılıksız)

Davranış: (1) Tahmini puan kartı + baraja uzaklık; (2) konu bazlı doğruluk yatay çubukları (yeşim >%70, altın %50-70, kiremit <%50); (3) deneme puanları çizgi grafiği (70 baraj çizgisi kesikli); (4) toplam çözülen soru / kart / çalışılan gün sayaçları. Grafik yoksa boş-durum metinleri.

- [ ] **Step 1:** Implement + elle doğrula (sahte examResults ile). **Commit** — `feat: statistics page with topic accuracy and exam score charts`

### Task 14: Sprint Planı + Ayarlar

**Files:** Create: `src/pages/Plan.tsx`, `src/pages/Ayarlar.tsx`

Davranış: Plan — `generatePlan(bugün, EXAM_DATE)` haftalara gruplu; bugün vurgulu; her günün hedefleri işaretlenebilir (`planProgress`); geçmiş günlerde tamamlanma yüzdesi. Ayarlar — tema seçici (koyu/açık/sistem); "Verini İndir" (exportState → `mks-yedek-YYYY-MM-DD.json` indir); "Yedekten Yükle" (dosya seç → importState, hatalıysa Türkçe hata); "Sıfırla" (onaylı); hakkında kutusu (sınav bilgileri + resmi kaynak linkleri).

- [ ] **Step 1:** Implement + elle doğrula (export→import round-trip dahil). **Commit** — `feat: sprint plan page and settings with backup/restore`

### Task 15: PWA + manifest + ikonlar

**Files:** Modify: `vite.config.ts`; Create: `public/pwa-192.png`, `public/pwa-512.png`, `public/apple-touch-icon.png`, `public/favicon.svg`

- [ ] **Step 1:** İkon üret — favicon.svg: terracotta zeminde fildişi "MKS" monogramı + İyon sütun başı silüeti (elle SVG yaz); PNG'ler: `npx sharp-cli` yerine basit yol — SVG'yi Playwright MCP ile açıp screenshot al ya da `npm i -D sharp` + 10 satırlık script (`scripts/make-icons.ts`).
- [ ] **Step 2:** VitePWA manifest: `name: 'MKS Çalışma Odası'`, `short_name: 'MKS'`, `theme_color: '#12100E'`, `background_color: '#12100E'`, `display: 'standalone'`, `lang: 'tr'`; workbox `globPatterns: ['**/*.{js,css,html,woff2,png,svg}']`.
- [ ] **Step 3:** `npm run build && npm run preview` → Chrome'da PWA yüklenebilir + offline çalışıyor (DevTools offline modda gezinme). **Commit** — `feat: installable offline PWA with manifest and icons`

---

## Faz 3 — İçerik Üretimi (12 konu paketi + deneme + çıkmış)

> **İçerik üretim kuralları (her içerik görevi için geçerli):**
> - Üretici: Claude. Kaynak: kendi bilgisi + resmi konu listesi; gerçek sınav stili kalibrasyonu: kısa, bilgi odaklı sorular (örn. "Plog", "kündekari", "I. Hattuşili" tarzı — Şubat 2025 derlemesinden gözlemlendi).
> - Her soru: 4 şık, tek doğru, HER şık için açıklama (doğruysa neden, yanlışsa neden değil), `subtopic`, `difficulty` (1 kolay ballanmış bilgi, 2 orta, 3 çeldirici ağırlıklı), gerekiyorsa `trick`.
> - Zorluk dağılımı hedefi: %30 kolay, %50 orta, %20 zor.
> - Konu anlatımı: `fullNotes` ≥5 bölüm (sınavda çıkan alt başlıklar), `shortNotes` ~600-900 kelime "sınav sabahı okuması", `tricks` ≥8 madde (karıştırılan çiftler: örn. kündekari/kakma, Hattuşili/Şuppiluliuma), `flashcards` ≥25.
> - Her görev sonunda: `src/content/index.ts`'e kayıt + `npm run validate:content` YEŞİL + `npm test` YEŞİL + commit.
> - Doğruluk: emin olunmayan tarih/isim yazılmaz; şüpheli olgu WebSearch ile teyit edilir (özellikle mevzuat maddeleri, UNESCO listesi, güncel müze bilgileri).

### Task 16-27: Konu paketleri (her görev = 1 konu)

Sıra (deneme ağırlığı yüksek → önce): 16 `anadolu-medeniyetleri`, 17 `arkeoloji-mitoloji`, 18 `sanat-tarihi`, 19 `roma-yunan-bizans`, 20 `turizm-cografyasi`, 21 `genel-turizm`, 22 `osmanli-tarihi`, 23 `genel-turk-tarihi`, 24 `dinler-tarihi`, 25 `halk-bilimi-edebiyat`, 26 `ilk-yardim`, 27 `muzecilik`.

Her görevin dosyaları: Create `src/content/topics/<id>.json`, `src/content/questions/<id>.json`; Modify `src/content/index.ts`.

Her görevin adımları:
- [ ] **Step 1:** Konu anlatımı JSON'u yaz (fullNotes/shortNotes/tricks/flashcards — yukarıdaki eşikler).
- [ ] **Step 2:** 40 soru yaz (alt konu kapsama listesi görev başında çıkarılır; örn. anadolu-medeniyetleri: Neolitik [Çatalhöyük, Göbeklitepe], Hatti/Hitit, Frig, Urartu, Lidya, İyonya, Likya, Karya, Pers dönemi, Helenistik krallıklar).
- [ ] **Step 3:** `npm run validate:content` + `npm test` yeşil; KonuDetay sayfasında elle görsel kontrol.
- [ ] **Step 4: Commit** — `content: <topic> pack (notes, tricks, 40 questions, flashcards)`

### Task 28: Deneme-1 (tam simülasyon)

**Files:** Create: `src/content/exams/deneme-1.json`; Modify: `src/content/index.ts`

- [ ] **Step 1:** examWeight dağılımına göre tam 100 YENİ soru (bankadakilerden farklı, aynı kalite kuralları), `kind: 'deneme'`.
- [ ] **Step 2:** validate + test yeşil; SinavOdasi'nda uçtan uca elle çözüm turu (en az 10 soru + teslim + sonuç ekranı).
- [ ] **Step 3: Commit** — `content: full 100-question mock exam deneme-1`

### Task 29: Çıkmış sorular derlemesi (Şubat 2025)

**Files:** Create: `src/content/exams/cikmis-2025-subat.json`; Modify: `src/content/index.ts`

- [ ] **Step 1:** Wayground'daki kamuya açık 23 Şubat 2025 derlemesini (112 soru) WebFetch ile parça parça çek; okunabilenleri ayıkla, 4-şık formatına oturt, her soruya açıklama YAZ (derlemede açıklama yok — Claude ekler), `kind: 'cikmis'`, `note: 'Aday derlemelerinden; resmi kitapçık değildir.'`
- [ ] **Step 2:** Çekilemeyen/bozuk sorular atlanır (≥50 soru hedef; alt sınır şemada var). validate + test yeşil.
- [ ] **Step 3: Commit** — `content: february 2025 past-exam compilation with added explanations`

---

## Faz 4 — Kalite, QA ve Yayın

### Task 30: QA turu (Playwright MCP) + hata düzeltme

- [ ] **Step 1:** `npm run build && npm run preview` → Playwright MCP ile 390×844 (telefon) ve 1440×900 (masaüstü) viewport'larında akış turu: onboarding'siz ilk açılış → dashboard → konu oku → 10 soru çöz (yanlış yap → açıklama gör) → tekrar kartı çevir → deneme başlat/teslim → istatistik → export/import → tema değiştir. Her ekrandan screenshot.
- [ ] **Step 2:** Bulunan her hata için: önce başarısız test (mümkünse), sonra düzeltme, sonra yeşil. Görsel pürüzler (taşma, kontrast, Türkçe kırılma) düzeltilir.
- [ ] **Step 3:** `npm test` + `npm run validate:content` + `npm run build` üçü de yeşil. **Commit** — `test: QA fixes from device walkthrough`

### Task 31: Yayın (deploy)

- [ ] **Step 1:** README.md — kullanım kılavuzu (Türkçe): siteye girme, ana ekrana ekleme (iOS/Android), yedek alma/yükleme, içerik-gelen-kutusu akışı.
- [ ] **Step 2:** Kullanıcıya sor (AskUserQuestion): Netlify mi Vercel mi + hesap durumu. Hesap yoksa: ücretsiz hesap açtır, `npx netlify-cli deploy --prod` (drag-drop alternatifi anlatılır).
- [ ] **Step 3:** Canlı linkte PWA kurulumunu ve offline'ı telefon görünümünde doğrula (Playwright MCP + gerçek cihaz talimatı kullanıcıya).
- [ ] **Step 4: Commit + tag** — `chore: v1.0 release notes and deploy docs`, `git tag v1.0`.

---

## Self-Review Notları

- **Spec kapsama:** Tüm modüller (spec §3) Task 7-14'te; içerik planı (§4) Task 16-29'da; teknik mimari (§5) Task 1-3, 15; kalite (§6) Task 2/30; tasarım dili (§7) Task 7 + frontend-design skill. Gelen kutusu Task 1'de. ✓
- **Şık sayısı açık maddesi kapatıldı:** 4 şık (A-D), Şubat 2025 derlemesiyle doğrulandı; Global Constraints'e işlendi. ✓
- **Tip tutarlılığı:** `AppState`, `Question`, `PlanDay`, motor imzaları tek yerde (Task 2-6) tanımlı; UI görevleri yalnızca bu imzaları tüketiyor. ✓
- **YAGNI:** hesap sistemi, çoklu kullanıcı, SEO yok; grafikler bağımlılıksız SVG. ✓
