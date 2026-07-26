import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, ChevronRight, Sparkles, X } from 'lucide-react';
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
 * Soru aileleri: konu anlatımı okumak yerine soru üzerinden öğrenme.
 *
 * Akış: gerçek çıkmış soru → kısa anlatım → aynı bilgiyi farklı açıdan yoklayan
 * 3 türev. Amaç, bilgiyi tek bir soru kalıbına değil konunun kendisine bağlamak.
 */
/** Uzun soru gövdesini kelime sınırında keser — ortadan bölünmüş kelime bırakmaz. */
function kisalt(s: string, n: number): string {
  const tek = s.replace(/\s+/g, ' ').trim();
  if (tek.length <= n) return tek;
  const kesik = tek.slice(0, n);
  return `${kesik.slice(0, kesik.lastIndexOf(' '))}…`;
}

export default function SoruAileleri() {
  const { state } = useAppState();
  const [acikAile, setAcikAile] = useState<SoruAilesi | null>(null);
  const [konu, setKonu] = useState<TopicId | 'hepsi'>('hepsi');

  /** Hangi aile ne kadar çözülmüş — kart durumu için. */
  const ilerlemeler = useMemo(() => {
    const m = new Map<string, { cozulen: number; tamam: boolean }>();
    for (const a of aileler) {
      const idler = [a.kaynak.soru.id, ...a.turevler.map((t) => t.id)];
      const cozulen = idler.filter((id) => state.attempts[id]).length;
      if (cozulen > 0) m.set(a.id, { cozulen, tamam: cozulen === idler.length });
    }
    return m;
  }, [state.attempts]);

  const listelenen = useMemo(
    () => (konu === 'hepsi' ? aileler : aileler.filter((a) => a.topicId === konu)),
    [konu],
  );

  const konulu = useMemo(() => {
    const say = new Map<TopicId, number>();
    for (const a of aileler) say.set(a.topicId, (say.get(a.topicId) ?? 0) + 1);
    return TOPIC_IDS.filter((id) => say.has(id)).map((id) => ({ id, n: say.get(id)! }));
  }, []);

  if (acikAile) return <AileCozucu aile={acikAile} onKapat={() => setAcikAile(null)} />;

  return (
    <div>
      <PageHeader
        eyebrow="ÇALIŞMA YÖNTEMİ"
        title="Sorularla Öğreniyorum"
        subtitle="Çıkmış bir soru, ardından aynı konudan çıkabilecek üç soru daha. Okuyarak değil, çözerek."
      />

      {aileler.length === 0 ? (
        <p className="rounded-(--radius-card) border border-line bg-surface p-6 text-center text-sm text-muted">
          Henüz soru ailesi hazırlanmadı.
        </p>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setKonu('hepsi')}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                konu === 'hepsi' ? 'border-mercan bg-mercan/10 text-mercan' : 'border-line hover:border-line-hi'
              }`}
            >
              Tümü ({aileler.length})
            </button>
            {konulu.map(({ id, n }) => (
              <button
                key={id}
                type="button"
                onClick={() => setKonu(id)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  konu === id ? 'border-mercan bg-mercan/10 text-mercan' : 'border-line hover:border-line-hi'
                }`}
              >
                {TOPICS[id].short} ({n})
              </button>
            ))}
          </div>

          <ul className="space-y-2.5">
            {listelenen.map((a) => {
              const durum = ilerlemeler.get(a.id);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setAcikAile(a)}
                    className="flex w-full items-start gap-3 rounded-(--radius-card) border border-line bg-surface p-4 text-left transition-colors hover:border-mercan"
                  >
                    <span
                      className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg text-[11px] font-semibold ${
                        durum?.tamam ? 'bg-turkuaz/15 text-turkuaz' : 'bg-raised text-muted'
                      }`}
                      aria-hidden
                    >
                      {durum?.tamam ? <Check className="size-4" strokeWidth={2.5} /> : `${1 + a.turevler.length}`}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-kobalt/15 px-2 py-0.5 text-[10px] font-semibold text-kobalt">
                          {TOPICS[a.topicId].short}
                        </span>
                        <span className="text-[11px] text-muted">{a.kaynak.examTitle}</span>
                        {durum && !durum.tamam && (
                          <span className="rounded-full bg-altin/15 px-2 py-0.5 text-[10px] font-semibold text-altin">
                            YARIM · {durum.cozulen}/{1 + a.turevler.length}
                          </span>
                        )}
                      </p>

                      {/*
                        Kartta sorunun KENDİSİ gösterilir, çekirdek bilgi değil.
                        Çekirdek çoğu ailede doğrudan cevabı içeriyordu
                        ("...tek varlığı Pamukkale-Hierapolis'tir") — liste
                        soruları açmadan cevabı ele veriyordu.
                      */}
                      <p className="text-sm font-medium leading-snug">{kisalt(a.kaynak.soru.stem, 110)}</p>

                      <p className="mt-1.5 text-xs text-muted">
                        1 çıkmış soru + {a.turevler.length} türev
                        {durum?.tamam && ' · tamamlandı'}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 size-4 shrink-0 text-muted" />
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

/**
 * Akışta ayrı bir "oku" ekranı YOK.
 *
 * Önce kaynak soru → özet ekranı → türevler şeklindeydi. Araya giren metin
 * ekranı, çözme akışının ortasında engel gibi durup atlanıyordu. Anlatım artık
 * kaynak sorunun cevabının hemen altında görünüyor: öğrencinin "neden?" merakı
 * tam o anda zirvede oluyor ve bilgi orada yapışıyor.
 */
type Asama = 'kaynak' | 'turev';

function AileCozucu({ aile, onKapat }: { aile: SoruAilesi; onKapat: () => void }) {
  const { update } = useAppState();
  const { askQuestion } = useAiHoca();

  const [asama, setAsama] = useState<Asama>('kaynak');
  const [turevIndex, setTurevIndex] = useState(0);
  const [secim, setSecim] = useState<ChoiceId | null>(null);
  const [dogruSayisi, setDogruSayisi] = useState(0);

  const aktifSoru: AileSoru = asama === 'kaynak' ? aile.kaynak.soru : aile.turevler[turevIndex];
  const toplamSoru = 1 + aile.turevler.length;
  const sira = asama === 'kaynak' ? 1 : turevIndex + 2;

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
    if (asama === 'kaynak') setAsama('turev');
    else if (turevIndex < aile.turevler.length - 1) setTurevIndex((i) => i + 1);
  };

  const bitti = asama === 'turev' && turevIndex === aile.turevler.length - 1 && secim !== null;

  return (
    <div>
      <button type="button" onClick={onKapat} className="tap-target mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Sorularla Öğreniyorum
      </button>

      {/* İlerleme */}
      <div className="mb-5 flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-raised">
          <div
            className="h-full bg-mercan transition-[width] duration-500"
            style={{ width: `${(sira / toplamSoru) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {sira}/{toplamSoru}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {
          /* ── Soru ekranı ───────────────────────────────────────── */
          <motion.section
            key={`${asama}-${turevIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-(--radius-card) border border-line bg-surface p-5"
          >
            <p className="mb-3">
              {asama === 'kaynak' ? (
                <span className="rounded-full bg-turkuaz/15 px-2.5 py-1 text-[11px] font-semibold text-turkuaz">
                  ÇIKMIŞ SORU · {aile.kaynak.examTitle}
                </span>
              ) : (
                <span className="rounded-full bg-altin/15 px-2.5 py-1 text-[11px] font-semibold text-altin">
                  ÇIKABİLİR · {turevIndex + 1}. türev
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

                {/*
                  Anlatım tam burada: öğrenci soruyu yeni çözdü, "neden?" merakı
                  zirvede. Ayrı bir ekrana konduğunda atlanıyordu.
                */}
                {asama === 'kaynak' && (
                  <div className="rounded-lg border-l-2 border-altin bg-altin/5 py-3 pl-4 pr-3">
                    <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-altin">
                      Bunu bilirsen sonraki 3 soruyu da çözersin
                    </p>
                    <p className="mb-2 text-sm font-semibold">{aile.cekirdek}</p>
                    <div className="text-[0.875rem] leading-relaxed">
                      <MarkdownView>{aile.ozet}</MarkdownView>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    askQuestion(
                      aileSorusunuQuestion(aktifSoru, aile.topicId, aile.cekirdek),
                      secim ?? undefined,
                    )
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-kobalt/40 bg-kobalt/10 px-4 py-2.5 text-sm font-medium text-kobalt"
                >
                  <Sparkles className="size-4" /> AI Hoca'ya sor — daha derin anlat
                </button>

                {!bitti ? (
                  <button
                    type="button"
                    onClick={ilerle}
                    className="w-full rounded-lg bg-mercan px-4 py-3 text-sm font-semibold text-mercan-ink"
                  >
                    {asama === 'kaynak' ? 'Şimdi bunu öğren' : 'Sonraki soru'}
                  </button>
                ) : (
                  <div className="rounded-lg border border-line bg-ground/40 p-4 text-center">
                    <p className="font-display text-lg font-semibold">
                      {dogruSayisi}/{toplamSoru} doğru
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {dogruSayisi === toplamSoru
                        ? 'Hepsi doğru — bu konu artık senin.'
                        : 'Yanlışların yanlış havuzuna eklendi, tekrar karşına çıkacaklar.'}
                    </p>
                    <button
                      type="button"
                      onClick={onKapat}
                      className="mt-3 w-full rounded-lg bg-mercan px-4 py-2.5 text-sm font-semibold text-mercan-ink"
                    >
                      Başka bir aileye geç
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </motion.section>
        }
      </AnimatePresence>
    </div>
  );
}
