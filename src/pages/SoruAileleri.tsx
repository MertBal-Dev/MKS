import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Send, Shuffle, Sparkles, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { MarkdownView } from '@/components/MarkdownView';
import { useAppState } from '@/hooks/useAppState';
import { useAiHoca } from '@/hooks/useAiHoca';
import { aileler } from '@/content/index';
import { TOPICS, TOPIC_IDS, type TopicId } from '@/lib/constants';
import { aileSorusunuQuestion, type AileSoru, type SoruAilesi } from '@/lib/soruAilesi';
import { recordAnswer } from '@/lib/wrongPool';
import { bumpStreak, todayKey } from '@/lib/streak';
import type { ChoiceId } from '@/lib/types';

/**
 * Sorularla Öğreniyorum — konu seç, çözerek öğren.
 *
 * Akış bilinçli olarak "göz gezdirmesiz": konu seçilir seçilmez doğrudan soru
 * gelir. Soru listesi göstermek, sorunun kendisini önceden okutup ipucu
 * veriyordu. Soruda tek bağlam, çıktığı sınav ve tarihtir.
 *
 * Sırası: gerçek çıkmış soru → (doğru bilse de) anlatım → "bu sınavda çıktı,
 * şimdi benzerlerine geçiyoruz" → 3 türev. Her adımda AI Hoca'ya hem tek tuşla
 * hem de kendi cümleleriyle soru sorulabilir.
 */
export default function SoruAileleri() {
  const { state } = useAppState();
  const [secilenKonu, setSecilenKonu] = useState<TopicId | 'karisik' | null>(null);

  /** Aile bazında çözülme durumu — konu kartlarındaki ilerleme için. */
  const ilerleme = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const a of aileler) {
      const idler = [a.kaynak.soru.id, ...a.turevler.map((t) => t.id)];
      m.set(a.id, idler.every((id) => state.attempts[id]));
    }
    return m;
  }, [state.attempts]);

  const konuVerisi = useMemo(() => {
    return TOPIC_IDS.map((id) => {
      const liste = aileler.filter((a) => a.topicId === id);
      return { id, toplam: liste.length, biten: liste.filter((a) => ilerleme.get(a.id)).length };
    }).filter((k) => k.toplam > 0);
  }, [ilerleme]);

  if (secilenKonu) {
    return <Oturum konu={secilenKonu} ilerleme={ilerleme} onCik={() => setSecilenKonu(null)} />;
  }

  const toplamAile = aileler.length;
  const toplamBiten = konuVerisi.reduce((n, k) => n + k.biten, 0);

  return (
    <div>
      <PageHeader
        eyebrow="ÇALIŞMA YÖNTEMİ"
        title="Sorularla Öğreniyorum"
        subtitle="Konu seç, çıkmış bir soruyla başla. Her sorudan sonra anlatım, ardından sınavda çıkabilecek üç soru daha."
      />

      {toplamAile === 0 ? (
        <p className="rounded-(--radius-card) border border-line bg-surface p-6 text-center text-sm text-muted">
          Henüz soru hazırlanmadı.
        </p>
      ) : (
        <>
          {/* Karışık — her konudan */}
          <button
            type="button"
            onClick={() => setSecilenKonu('karisik')}
            className="mb-4 flex w-full items-center gap-4 rounded-(--radius-card) border border-mercan bg-surface p-5 text-left transition-colors hover:bg-raised"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-mercan/15 text-mercan" aria-hidden>
              <Shuffle size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-semibold">Karışık</p>
              <p className="mt-0.5 text-xs text-muted">
                Her konudan soru gelir — gerçek sınav gibi. {toplamBiten}/{toplamAile} tamamlandı
              </p>
            </div>
            <ArrowRight className="size-5 shrink-0 text-muted" />
          </button>

          <h2 className="font-display mb-3 text-lg font-semibold">Konu Seç</h2>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {konuVerisi.map(({ id, toplam, biten }) => {
              const oran = toplam === 0 ? 0 : biten / toplam;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setSecilenKonu(id)}
                    className="flex w-full items-center gap-3 rounded-(--radius-card) border border-line bg-surface p-4 text-left transition-colors hover:border-mercan"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{TOPICS[id].short}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {toplam} soru grubu · {toplam * 4} soru
                        {biten > 0 && ` · ${biten} bitti`}
                      </p>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-raised">
                        <div
                          className={oran === 1 ? 'h-full bg-turkuaz' : 'h-full bg-mercan'}
                          style={{ width: `${oran * 100}%` }}
                        />
                      </div>
                    </div>
                    {oran === 1 && <Check className="size-4 shrink-0 text-turkuaz" strokeWidth={2.5} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */

type Asama = 'kaynak' | 'turev';

function Oturum({
  konu,
  ilerleme,
  onCik,
}: {
  konu: TopicId | 'karisik';
  ilerleme: Map<string, boolean>;
  onCik: () => void;
}) {
  const { update } = useAppState();
  const { askQuestion, send } = useAiHoca();

  /** Çözülmemişler önce; böylece her oturumda yeni içerik gelir. */
  const sira = useMemo(() => {
    const havuz = konu === 'karisik' ? aileler : aileler.filter((a) => a.topicId === konu);
    const bitmemis = havuz.filter((a) => !ilerleme.get(a.id));
    const bitmis = havuz.filter((a) => ilerleme.get(a.id));
    return [...bitmemis, ...bitmis];
    // Oturum boyunca sıra sabit kalsın diye ilerleme bağımlılığa alınmaz
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [konu]);

  const [aileIndex, setAileIndex] = useState(0);
  const [asama, setAsama] = useState<Asama>('kaynak');
  const [turevIndex, setTurevIndex] = useState(0);
  const [secim, setSecim] = useState<ChoiceId | null>(null);
  const [dogruSayisi, setDogruSayisi] = useState(0);
  const [soruMetni, setSoruMetni] = useState('');

  const aile: SoruAilesi | undefined = sira[aileIndex];

  if (!aile) {
    return (
      <div>
        <GeriDon onCik={onCik} konu={konu} />
        <p className="rounded-(--radius-card) border border-line bg-surface p-6 text-center text-sm text-muted">
          Bu konuda soru bulunamadı.
        </p>
      </div>
    );
  }

  const aktifSoru: AileSoru = asama === 'kaynak' ? aile.kaynak.soru : aile.turevler[turevIndex];
  const toplam = 1 + aile.turevler.length;
  const adim = asama === 'kaynak' ? 1 : turevIndex + 2;
  const sonSoru = asama === 'turev' && turevIndex === aile.turevler.length - 1;

  const cevapla = (id: ChoiceId) => {
    if (secim) return;
    setSecim(id);
    const dogru = id === aktifSoru.correct;
    if (dogru) setDogruSayisi((n) => n + 1);

    const now = new Date();
    update((prev) => ({
      ...prev,
      attempts: {
        ...prev.attempts,
        [aktifSoru.id]: {
          correct: (prev.attempts[aktifSoru.id]?.correct ?? 0) + (dogru ? 1 : 0),
          wrong: (prev.attempts[aktifSoru.id]?.wrong ?? 0) + (dogru ? 0 : 1),
          lastResult: dogru ? 'correct' : 'wrong',
          lastAt: now.toISOString(),
        },
      },
      wrongPool: recordAnswer(prev.wrongPool, aktifSoru.id, dogru ? 'correct' : 'wrong', now),
      streak: bumpStreak(prev.streak, todayKey(now)),
    }));
  };

  const ilerle = () => {
    setSecim(null);
    setSoruMetni('');
    if (asama === 'kaynak') setAsama('turev');
    else if (turevIndex < aile.turevler.length - 1) setTurevIndex((i) => i + 1);
  };

  const sonrakiAile = () => {
    setSecim(null);
    setSoruMetni('');
    setAsama('kaynak');
    setTurevIndex(0);
    setDogruSayisi(0);
    setAileIndex((i) => i + 1);
  };

  /**
   * Serbest metinli soruyu, sorunun bağlamıyla birlikte AI Hoca'ya iletir.
   * Önce askQuestion bağlamı kurar (panel açılır, soru bilgisi yüklenir),
   * ardından kullanıcının kendi cümlesi aynı sohbete gönderilir.
   */
  const aiyaSor = (metin?: string) => {
    askQuestion(aileSorusunuQuestion(aktifSoru, aile.topicId, aile.cekirdek), secim ?? undefined);
    const temiz = metin?.trim();
    if (temiz) {
      // Bağlam state'e yazıldıktan sonra gönder; aynı turda çağırmak soruyu bağlamsız bırakır
      setTimeout(() => send(temiz), 80);
    }
  };

  return (
    <div>
      <GeriDon onCik={onCik} konu={konu} />

      <div className="mb-5 flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-raised">
          <div className="h-full bg-mercan transition-[width] duration-500" style={{ width: `${(adim / toplam) * 100}%` }} />
        </div>
        <span className="text-xs text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {adim}/{toplam}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={`${aile.id}-${asama}-${turevIndex}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="rounded-(--radius-card) border border-line bg-surface p-5"
        >
          {/* Soruda tek bağlam: hangi sınavda çıktığı. Başka ipucu yok. */}
          <p className="mb-3">
            {asama === 'kaynak' ? (
              <span className="rounded-full bg-turkuaz/15 px-2.5 py-1 text-[11px] font-semibold text-turkuaz">
                {aile.kaynak.examTitle}
              </span>
            ) : (
              <span className="rounded-full bg-altin/15 px-2.5 py-1 text-[11px] font-semibold text-altin">
                ÇIKABİLİR · {turevIndex + 1}/{aile.turevler.length}
              </span>
            )}
          </p>

          <p className="mb-4 whitespace-pre-line text-[0.95rem] font-medium leading-relaxed">{aktifSoru.stem}</p>

          <ul className="space-y-2">
            {aktifSoru.choices.map((c) => {
              const secili = secim === c.id;
              const dogruSik = c.id === aktifSoru.correct;
              const goster = secim !== null;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={goster}
                    onClick={() => cevapla(c.id as ChoiceId)}
                    className={[
                      'flex w-full items-start gap-3 rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors',
                      !goster ? 'border-line hover:border-mercan' : '',
                      goster && dogruSik ? 'border-turkuaz bg-turkuaz/10' : '',
                      goster && secili && !dogruSik ? 'border-kizil bg-kizil/10' : '',
                      goster && !dogruSik && !secili ? 'border-line opacity-60' : '',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'mt-0.5 grid size-5 shrink-0 place-items-center rounded-md text-[11px] font-semibold',
                        goster && dogruSik ? 'bg-turkuaz text-ground' : '',
                        goster && secili && !dogruSik ? 'bg-kizil text-ground' : '',
                        !goster || (!dogruSik && !secili) ? 'bg-raised text-muted' : '',
                      ].join(' ')}
                    >
                      {goster && dogruSik ? <Check className="size-3.5" strokeWidth={3} /> : goster && secili ? <X className="size-3.5" strokeWidth={3} /> : c.id}
                    </span>
                    <span className="flex-1">
                      {c.text}
                      {goster && (dogruSik || secili) && (
                        <span className={`mt-1 block text-xs ${dogruSik ? 'text-turkuaz' : 'text-kizil'}`}>{c.explanation}</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {secim !== null && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 space-y-3">
              {aktifSoru.trick && (
                <p className="rounded-lg bg-altin/10 p-3 text-xs text-altin">
                  <strong>Tuzak:</strong> {aktifSoru.trick}
                </p>
              )}

              {/* Anlatım, doğru bilinse de gösterilir — asıl öğrenme burada olur. */}
              {asama === 'kaynak' && (
                <div className="rounded-lg border-l-2 border-altin bg-altin/5 py-3 pl-4 pr-3">
                  <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-altin">Anlatım</p>
                  <p className="mb-2 text-sm font-semibold">{aile.cekirdek}</p>
                  <div className="text-[0.875rem] leading-relaxed">
                    <MarkdownView>{aile.ozet}</MarkdownView>
                  </div>
                </div>
              )}

              {/* Kendi cümleleriyle soru sorma */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  aiyaSor(soruMetni);
                  setSoruMetni('');
                }}
                className="rounded-lg border border-kobalt/30 bg-kobalt/5 p-3"
              >
                <label htmlFor="ai-soru" className="mb-2 block text-xs font-medium text-kobalt">
                  Takıldığın bir şey mi var? AI Hoca'ya kendi cümlelerinle sor
                </label>
                <div className="flex gap-2">
                  <input
                    id="ai-soru"
                    value={soruMetni}
                    onChange={(e) => setSoruMetni(e.target.value)}
                    placeholder="Örn: B şıkkı neden olmuyor?"
                    className="min-w-0 flex-1 rounded-lg border border-line bg-ground px-3 py-2 text-sm outline-none focus:border-kobalt"
                  />
                  <button
                    type="submit"
                    aria-label="Gönder"
                    className="grid size-9 shrink-0 place-items-center rounded-lg bg-kobalt text-ground"
                  >
                    <Send className="size-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => aiyaSor()}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-kobalt hover:underline"
                >
                  <Sparkles className="size-3.5" /> Ya da tam detaylı anlatım iste
                </button>
              </form>

              {/* Geçiş mesajı: çıkmış sorudan türevlere */}
              {asama === 'kaynak' ? (
                <button
                  type="button"
                  onClick={ilerle}
                  className="w-full rounded-lg bg-mercan px-4 py-3 text-left text-sm font-semibold text-mercan-ink"
                >
                  Bu soru sınavda çıktı. Şimdi buna benzeyen, dikkat etmen gereken {aile.turevler.length} soruya geçiyoruz →
                </button>
              ) : !sonSoru ? (
                <button type="button" onClick={ilerle} className="w-full rounded-lg bg-mercan px-4 py-3 text-sm font-semibold text-mercan-ink">
                  Sonraki soru
                </button>
              ) : (
                <div className="rounded-lg border border-line bg-ground/40 p-4 text-center">
                  <p className="font-display text-lg font-semibold">
                    {dogruSayisi}/{toplam} doğru
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {dogruSayisi === toplam
                      ? 'Hepsi doğru — bu konu artık senin.'
                      : 'Yanlışların yanlış havuzuna eklendi, tekrar karşına çıkacaklar.'}
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    {aileIndex < sira.length - 1 && (
                      <button
                        type="button"
                        onClick={sonrakiAile}
                        className="flex-1 rounded-lg bg-mercan px-4 py-2.5 text-sm font-semibold text-mercan-ink"
                      >
                        Sonraki soru grubu ({aileIndex + 2}/{sira.length})
                      </button>
                    )}
                    <button type="button" onClick={onCik} className="flex-1 rounded-lg border border-line px-4 py-2.5 text-sm">
                      Konu seçimine dön
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.section>
      </AnimatePresence>
    </div>
  );
}

function GeriDon({ onCik, konu }: { onCik: () => void; konu: TopicId | 'karisik' }) {
  return (
    <button type="button" onClick={onCik} className="tap-target mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
      <ArrowLeft className="size-4" />
      {konu === 'karisik' ? 'Karışık' : TOPICS[konu].short} — konu seçimi
    </button>
  );
}
