import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarHeart, Check, Play, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useAppState } from '@/hooks/useAppState';
import { PASS_SCORE } from '@/lib/constants';
import { DAILY_DURATION_MIN, DAILY_EXAM_PREFIX, DAILY_QUESTION_COUNT } from '@/lib/dailyExam';
import { todayKey } from '@/lib/streak';

/**
 * Günlük denemelerin arşivi.
 *
 * Günün seti tarihten deterministik üretildiği için GEÇMİŞ HER GÜN yeniden
 * kurulabilir — kaybolmaz. Önceden arayüz yalnızca çözülmüş günleri gösteriyor
 * ve onları da sonuç sayfasına bağlıyordu; çözülmemiş bir gün geçince
 * erişilemez oluyordu. Bu sayfa her günü listeler ve çözülmemişleri çözülebilir kılar.
 */

const GUN_MS = 86_400_000;
const VARSAYILAN_GUN = 30;

/**
 * Arşivin başlangıcı. Setler tarihten üretildiği için teknik olarak her tarih
 * çözülebilir, ama uygulamadan önceki günleri listelemek anlamsız bir geçmiş
 * uyduruyordu (Mayıs'a kadar iniyordu). Bu tarihten öncesi gösterilmez.
 */
const BASLANGIC = '2026-07-01';

function tarihEkle(dateKey: string, gun: number): string {
  return new Date(new Date(`${dateKey}T00:00:00Z`).getTime() + gun * GUN_MS).toISOString().slice(0, 10);
}

function etiket(dateKey: string): { uzun: string; kisa: string; gunAdi: string } {
  const d = new Date(`${dateKey}T12:00:00+03:00`);
  const o = { timeZone: 'Europe/Istanbul' } as const;
  return {
    uzun: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', ...o }),
    kisa: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', ...o }),
    gunAdi: d.toLocaleDateString('tr-TR', { weekday: 'long', ...o }),
  };
}

export default function GunlukDenemeler() {
  const { state } = useAppState();
  const today = todayKey();
  const [gunSayisi, setGunSayisi] = useState(VARSAYILAN_GUN);

  /** examId -> en iyi sonuç */
  const sonuclar = useMemo(() => {
    const m = new Map<string, { score: number; finishedAt: string; kez: number }>();
    for (const r of state.examResults) {
      if (!r.examId.startsWith(DAILY_EXAM_PREFIX)) continue;
      const v = m.get(r.examId);
      m.set(r.examId, {
        score: v ? Math.max(v.score, r.score) : r.score,
        finishedAt: r.finishedAt,
        kez: (v?.kez ?? 0) + 1,
      });
    }
    return m;
  }, [state.examResults]);

  /** Bugünden geriye, BASLANGIC'ı geçmeden. Gelecek gün hiç üretilmez. */
  const gunler = useMemo(() => {
    const liste: string[] = [];
    for (let i = 0; i < gunSayisi; i++) {
      const g = tarihEkle(today, -i);
      if (g < BASLANGIC) break;
      liste.push(g);
    }
    return liste;
  }, [today, gunSayisi]);

  /** Başlangıca ulaşıldıysa "daha eski" düğmesi anlamsızdır. */
  const dahaEskiVar = gunler.length > 0 && gunler[gunler.length - 1] > BASLANGIC;

  const cozulen = gunler.filter((g) => sonuclar.has(`${DAILY_EXAM_PREFIX}${g}`)).length;
  const bekleyen = gunler.length - cozulen;

  return (
    <div>
      <Link to="/denemeler" className="tap-target mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Denemeler
      </Link>

      <PageHeader
        eyebrow="GÜNLÜK ARŞİV"
        title="Günün Denemeleri"
        subtitle={`Her gün ${DAILY_QUESTION_COUNT} soruluk yeni bir set. Kaçırdığın günler kaybolmaz — hepsi burada, çözülmeyi bekliyor.`}
      />

      {/* Özet şerit */}
      <div className="mb-5 grid grid-cols-3 gap-px overflow-hidden rounded-(--radius-card) border border-line bg-line">
        {[
          { v: cozulen, l: 'çözülen gün', c: 'text-turkuaz' },
          { v: bekleyen, l: 'bekleyen gün', c: bekleyen > 0 ? 'text-altin' : '' },
          { v: `${DAILY_QUESTION_COUNT}×${bekleyen}`, l: 'çözülmemiş soru' },
        ].map((s) => (
          <div key={s.l} className="bg-surface px-4 py-3.5">
            <p className={`font-display text-xl font-semibold ${s.c ?? ''}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {s.v}
            </p>
            <p className="mt-0.5 text-xs text-muted">{s.l}</p>
          </div>
        ))}
      </div>

      <ul className="space-y-2">
        {gunler.map((g, i) => {
          const id = `${DAILY_EXAM_PREFIX}${g}`;
          const sonuc = sonuclar.get(id);
          const bugun = g === today;
          const { uzun, gunAdi } = etiket(g);
          const gecti = sonuc ? sonuc.score >= PASS_SCORE : false;

          return (
            <motion.li
              key={g}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              className={`flex flex-wrap items-center gap-3 rounded-(--radius-card) border bg-surface p-4 ${
                bugun ? 'border-altin' : 'border-line'
              }`}
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                  sonuc ? (gecti ? 'bg-turkuaz/15 text-turkuaz' : 'bg-altin/15 text-altin') : 'bg-raised text-muted'
                }`}
                aria-hidden
              >
                {sonuc ? <Check size={18} strokeWidth={2.5} /> : <CalendarHeart size={18} />}
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {uzun}
                  {bugun && (
                    <span className="rounded-full bg-altin/15 px-2 py-0.5 text-[10px] font-semibold text-altin">BUGÜN</span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {gunAdi} • {DAILY_QUESTION_COUNT} soru • {DAILY_DURATION_MIN} dk
                  {sonuc && sonuc.kez > 1 && ` • ${sonuc.kez} kez çözüldü`}
                </p>
              </div>

              {sonuc ? (
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`font-display text-xl font-semibold ${gecti ? 'text-turkuaz' : 'text-altin'}`}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {Math.round(sonuc.score)}
                  </span>
                  <Link
                    to={`/sinav/${id}/sonuc`}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:text-ink"
                  >
                    Sonuç
                  </Link>
                  <Link
                    to={`/sinav/${id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs hover:border-mercan"
                    title="Aynı seti yeniden çöz"
                  >
                    <RotateCcw className="size-3.5" /> Tekrar
                  </Link>
                </div>
              ) : (
                <Link
                  to={`/sinav/${id}`}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold ${
                    bugun ? 'bg-altin text-ground' : 'bg-mercan text-mercan-ink'
                  }`}
                >
                  <Play className="size-3.5" /> {bugun ? 'Bugünü çöz' : 'Çöz'}
                </Link>
              )}
            </motion.li>
          );
        })}
      </ul>

      <div className="mt-5 text-center">
        {dahaEskiVar && (
          <button
            type="button"
            onClick={() => setGunSayisi((n) => n + 30)}
            className="rounded-lg border border-line px-5 py-2.5 text-sm text-muted hover:border-mercan hover:text-ink"
          >
            Daha eski günleri göster
          </button>
        )}
        <p className="mt-3 text-xs text-muted">
          Setler tarihten üretilir; aynı gün her cihazda aynı sorular gelir ve geçmiş günler hiç kaybolmaz.
        </p>
      </div>
    </div>
  );
}
