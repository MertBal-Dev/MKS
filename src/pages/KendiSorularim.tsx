import { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, FileText, Loader2, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { TOPICS } from '@/lib/constants';
import {
  BLOCK_SIZE,
  blocksOf,
  deleteSet,
  loadSets,
  upsertSet,
  type CustomQuestion,
  type CustomSet,
} from '@/lib/customSets';
import { KABUL_EDILEN, dosyadanKaynak, jsonDiziCikar, normalize, parcala, type Kaynak } from '@/lib/importQuestions';

type Asama =
  | { tur: 'bos' }
  | { tur: 'okunuyor'; ad: string }
  | { tur: 'ayristiriliyor'; ad: string; biten: number; toplam: number }
  | { tur: 'inceleme'; ad: string; sorular: CustomQuestion[] }
  | { tur: 'hata'; mesaj: string };

const HARFLER = ['A', 'B', 'C', 'D', 'E'] as const;

async function parseCall(payload: { text?: string; document?: Kaynak['document'] }): Promise<unknown[]> {
  const res = await fetch('/api/ai-hoca', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'parse', ...payload }),
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error('Soru okuyucu bu adreste çalışmıyor. Geliştirme sunucusunu veya yayındaki siteyi kullan.');
    if (res.status >= 500) throw new Error('Soru okuyucu yanıt vermedi. Vertex AI ayarlarını kontrol et.');
    throw new Error('Belge okunamadı. Başka bir dosyayla dene.');
  }
  const { text } = (await res.json()) as { text: string };
  return jsonDiziCikar(text);
}

/** Kaynak rozetleri: cevabın nereden geldiğini gizlemeden göster. */
function KaynakRozet({ q }: { q: CustomQuestion }) {
  if (q.answerSource === 'belge') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-turkuaz/15 px-2 py-0.5 text-[10px] font-semibold text-turkuaz">
        <Check className="size-3" /> BELGEDEN
      </span>
    );
  }
  const belirsiz = q.confidence === 'belirsiz';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        belirsiz ? 'bg-kizil/15 text-kizil' : 'bg-altin/15 text-altin'
      }`}
    >
      <AlertTriangle className="size-3" /> {belirsiz ? 'AI — EMİN DEĞİL' : 'AI ÇÖZDÜ'}
    </span>
  );
}

export default function KendiSorularim() {
  const [sets, setSets] = useState<CustomSet[]>(() => loadSets());
  const [asama, setAsama] = useState<Asama>({ tur: 'bos' });
  const [yapistir, setYapistir] = useState('');
  const [baslik, setBaslik] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const belirsizSayisi = useMemo(
    () => (asama.tur === 'inceleme' ? asama.sorular.filter((q) => q.confidence === 'belirsiz').length : 0),
    [asama],
  );

  const isle = useCallback(async (kaynak: Kaynak) => {
    try {
      const idOneki = `k${Date.now().toString(36)}`;

      // PDF/görsel tek parça gider; uzun metin parçalara bölünür.
      const parcalar = kaynak.document ? [null] : parcala(kaynak.text ?? '');
      setAsama({ tur: 'ayristiriliyor', ad: kaynak.ad, biten: 0, toplam: parcalar.length });

      const hepsi: CustomQuestion[] = [];
      for (let i = 0; i < parcalar.length; i++) {
        const ham = await parseCall(
          kaynak.document ? { document: kaynak.document } : { text: parcalar[i] as string },
        );
        hepsi.push(...normalize(ham, `${idOneki}-${i}`));
        setAsama({ tur: 'ayristiriliyor', ad: kaynak.ad, biten: i + 1, toplam: parcalar.length });
      }

      if (hepsi.length === 0) {
        setAsama({
          tur: 'hata',
          mesaj:
            'Belgede çoktan seçmeli soru bulunamadı. Dosyanın soruları düz metin içerdiğinden emin ol; el yazısı veya çok bozuk taramalar okunamayabilir.',
        });
        return;
      }

      setBaslik(kaynak.ad.replace(/\.[^.]+$/, ''));
      setAsama({ tur: 'inceleme', ad: kaynak.ad, sorular: hepsi });
    } catch (e) {
      setAsama({ tur: 'hata', mesaj: e instanceof Error ? e.message : 'Beklenmeyen bir hata oldu.' });
    }
  }, []);

  const dosyaSecildi = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setAsama({ tur: 'okunuyor', ad: file.name });
      try {
        await isle(await dosyadanKaynak(file));
      } catch (e) {
        setAsama({ tur: 'hata', mesaj: e instanceof Error ? e.message : 'Dosya okunamadı.' });
      }
    },
    [isle],
  );

  const kaydet = useCallback(() => {
    if (asama.tur !== 'inceleme') return;
    const set: CustomSet = {
      id: `s${Date.now().toString(36)}`,
      title: baslik.trim() || asama.ad || 'Kendi sorularım',
      sourceName: asama.ad,
      createdAt: new Date().toISOString(),
      questions: asama.sorular,
    };
    setSets(upsertSet(set));
    setAsama({ tur: 'bos' });
    setYapistir('');
  }, [asama, baslik]);

  /** İnceleme ekranında doğru şıkkı elle düzeltmek, AI hatasının tek panzehiri. */
  const dogruDegistir = (index: number, harf: (typeof HARFLER)[number]) => {
    if (asama.tur !== 'inceleme') return;
    const sorular = asama.sorular.map((q, i) =>
      i === index ? { ...q, correct: harf, answerSource: 'kullanici' as const, confidence: 'kesin' as const } : q,
    );
    setAsama({ ...asama, sorular });
  };

  const soruSil = (index: number) => {
    if (asama.tur !== 'inceleme') return;
    setAsama({ ...asama, sorular: asama.sorular.filter((_, i) => i !== index) });
  };

  return (
    <div>
      <PageHeader
        eyebrow="KENDİ SORULARIM"
        title="Soru Yükle"
        subtitle="Elindeki PDF, Word veya fotoğrafı yükle; sorular ayıklanıp deneme hâline getirilsin."
      />

      {/* ── Yükleme ─────────────────────────────────────────── */}
      {(asama.tur === 'bos' || asama.tur === 'hata') && (
        <div className="space-y-4">
          {asama.tur === 'hata' && (
            <div className="flex items-start gap-3 rounded-(--radius-card) border border-kizil/40 bg-kizil/10 p-4 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-kizil" />
              <p className="flex-1">{asama.mesaj}</p>
              <button type="button" onClick={() => setAsama({ tur: 'bos' })} aria-label="Kapat">
                <X className="size-4 text-muted" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-3 rounded-(--radius-card) border border-dashed border-line-hi bg-surface px-6 py-10 transition-colors hover:border-mercan hover:bg-raised"
          >
            <Upload className="size-7 text-mercan" />
            <span className="font-display text-lg font-semibold">Dosya seç</span>
            <span className="max-w-md text-center text-sm text-muted">
              PDF, Word (.docx), fotoğraf veya düz metin. Taranmış ve fotoğrafla çekilmiş sayfalar da okunur.
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={KABUL_EDILEN}
            className="hidden"
            onChange={(e) => {
              void dosyaSecildi(e.target.files?.[0]);
              e.target.value = '';
            }}
          />

          <div className="rounded-(--radius-card) border border-line bg-surface p-4">
            <label htmlFor="yapistir" className="mb-2 block text-sm font-medium">
              Ya da soruları buraya yapıştır
            </label>
            <textarea
              id="yapistir"
              value={yapistir}
              onChange={(e) => setYapistir(e.target.value)}
              rows={6}
              placeholder={'1. Lidyalılar parayı hangi yüzyılda bulmuştur?\nA) MÖ 9. yy\nB) MÖ 7. yy\n...'}
              className="w-full resize-y rounded-lg border border-line bg-ground px-3 py-2 text-sm outline-none focus:border-mercan"
            />
            <button
              type="button"
              disabled={yapistir.trim().length < 40}
              onClick={() => void isle({ text: yapistir, ad: 'Yapıştırılan sorular' })}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-mercan px-4 py-2 text-sm font-semibold text-mercan-ink disabled:opacity-40"
            >
              <Sparkles className="size-4" /> Soruları ayıkla
            </button>
          </div>
        </div>
      )}

      {/* ── İşlem sürüyor ───────────────────────────────────── */}
      {(asama.tur === 'okunuyor' || asama.tur === 'ayristiriliyor') && (
        <div className="rounded-(--radius-card) border border-line bg-surface p-8 text-center">
          <Loader2 className="mx-auto mb-4 size-7 animate-spin text-mercan" />
          <p className="font-display text-lg font-semibold">
            {asama.tur === 'okunuyor' ? 'Dosya okunuyor…' : 'Sorular ayıklanıyor…'}
          </p>
          <p className="mt-1 text-sm text-muted">{asama.ad}</p>
          {asama.tur === 'ayristiriliyor' && asama.toplam > 1 && (
            <div className="mx-auto mt-4 h-1 w-56 overflow-hidden rounded-full bg-raised">
              <div className="h-full bg-mercan transition-[width]" style={{ width: `${(asama.biten / asama.toplam) * 100}%` }} />
            </div>
          )}
          <p className="mt-3 text-xs text-muted">Bu biraz sürebilir, sayfadan ayrılma.</p>
        </div>
      )}

      {/* ── İnceleme ────────────────────────────────────────── */}
      {asama.tur === 'inceleme' && (
        <div className="space-y-4">
          <div className="rounded-(--radius-card) border border-mercan bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold">{asama.sorular.length} soru bulundu</p>
                <p className="text-sm text-muted">
                  Kaydetmeden önce gözden geçir — özellikle işaretli olanları.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAsama({ tur: 'bos' })}
                  className="rounded-lg border border-line px-4 py-2 text-sm"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={kaydet}
                  className="rounded-lg bg-mercan px-4 py-2 text-sm font-semibold text-mercan-ink"
                >
                  Kaydet
                </button>
              </div>
            </div>

            {belirsizSayisi > 0 && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-kizil/10 p-3 text-sm text-kizil">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  <strong>{belirsizSayisi} sorunun</strong> cevabı belgede yoktu ve AI emin olamadı. Bunları
                  doğrulamadan çalışma — doğru şıkka tıklayarak düzeltebilirsin.
                </span>
              </p>
            )}

            <label htmlFor="set-baslik" className="mt-4 block text-sm font-medium">
              Set adı
            </label>
            <input
              id="set-baslik"
              value={baslik}
              onChange={(e) => setBaslik(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-ground px-3 py-2 text-sm outline-none focus:border-mercan"
            />
          </div>

          <ul className="space-y-3">
            {asama.sorular.map((q, i) => (
              <li key={q.id} className="rounded-(--radius-card) border border-line bg-surface p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {i + 1}.
                  </span>
                  <KaynakRozet q={q} />
                  {q.topicId && <span className="text-xs text-muted">{TOPICS[q.topicId].short}</span>}
                  <button
                    type="button"
                    onClick={() => soruSil(i)}
                    className="ml-auto text-muted hover:text-kizil"
                    aria-label={`${i + 1}. soruyu sil`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <p className="mb-3 text-sm font-medium">{q.stem}</p>
                <div className="space-y-1.5">
                  {q.choices.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => dogruDegistir(i, c.id as (typeof HARFLER)[number])}
                      className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        c.id === q.correct
                          ? 'border-turkuaz bg-turkuaz/10'
                          : 'border-line hover:border-line-hi'
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md text-[11px] font-semibold ${
                          c.id === q.correct ? 'bg-turkuaz text-ground' : 'bg-raised text-muted'
                        }`}
                      >
                        {c.id}
                      </span>
                      <span>{c.text}</span>
                    </button>
                  ))}
                </div>
                {q.explanation && <p className="mt-2 text-xs text-muted">{q.explanation}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Kayıtlı setler ──────────────────────────────────── */}
      {asama.tur !== 'inceleme' && sets.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display mb-3 text-lg font-semibold">Kayıtlı setlerim</h2>
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {sets.map((set) => {
                const bloklar = blocksOf(set);
                const belirsiz = set.questions.filter((q) => q.confidence === 'belirsiz').length;
                return (
                  <motion.div
                    key={set.id}
                    layout
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-(--radius-card) border border-line bg-surface p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-medium">
                          <FileText className="size-4 shrink-0 text-muted" />
                          {set.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {set.questions.length} soru
                          {bloklar.length > 1 && ` • ${bloklar.length} bölüm (${BLOCK_SIZE}'şerlik)`}
                          {belirsiz > 0 && ` • ${belirsiz} şüpheli cevap`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSets(deleteSet(set.id))}
                        className="text-muted hover:text-kizil"
                        aria-label={`${set.title} setini sil`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {bloklar.map((blok, i) => (
                        <Link
                          key={i}
                          to={`/sinav/kendi-${set.id}-${i}`}
                          className="rounded-lg bg-mercan px-3.5 py-2 text-xs font-semibold text-mercan-ink"
                        >
                          {bloklar.length > 1 ? `${i + 1}. bölümü çöz` : 'Deneme olarak çöz'} ({blok.length})
                        </Link>
                      ))}
                      <Link
                        to={`/pratik?kendi=${set.id}`}
                        className="rounded-lg border border-line px-3.5 py-2 text-xs font-medium hover:border-mercan"
                      >
                        Tek tek çöz
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </section>
      )}
    </div>
  );
}
