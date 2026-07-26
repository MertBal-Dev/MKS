import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { useAppState } from '@/hooks/useAppState';
import { questionBank } from '@/content/index';
import { PASS_SCORE, TOPICS, TOPIC_IDS } from '@/lib/constants';
import { estimateScore, topicAccuracy } from '@/lib/scoring';
import { calismaOzeti, konuDokumu } from '@/lib/ozet';

const tr = (n: number) => n.toLocaleString('tr-TR');

export default function Istatistik() {
  const { state } = useAppState();
  const acc = topicAccuracy(state.attempts, questionBank);
  const estimate = estimateScore(acc);

  const ozet = useMemo(() => calismaOzeti(state, questionBank), [state]);
  const dokum = useMemo(() => konuDokumu(state, questionBank), [state]);

  const denemeler = useMemo(
    () => [...state.examResults].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt)),
    [state.examResults],
  );

  return (
    <div>
      <PageHeader eyebrow="DURUM" title="İstatistik" subtitle="Ne kadar çalıştın, neresi güçlü, neresi çalışmak istiyor" />

      {/* ── Çalışma özeti — "ne kadar yaptım" sorusunun cevabı ───────── */}
      <section className="rise-in mb-6">
        <h2 className="font-display mb-3 text-lg font-semibold">Çalışma Özetin</h2>

        {ozet.toplamCevap === 0 ? (
          <p className="rounded-(--radius-card) border border-line bg-surface p-6 text-center text-sm text-muted">
            Henüz soru çözmedin.{' '}
            <Link to="/soru-bankasi" className="text-kobalt">
              İlk sorunla başla
            </Link>{' '}
            — sayılar burada birikecek.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-(--radius-card) border border-line bg-line sm:grid-cols-4">
              {[
                { v: tr(ozet.toplamCevap), l: 'çözülen soru' },
                { v: tr(ozet.dogru), l: 'doğru', c: 'text-turkuaz' },
                { v: tr(ozet.yanlis), l: 'yanlış', c: 'text-kizil' },
                { v: `%${tr(ozet.basari ?? 0)}`, l: 'başarı', c: (ozet.basari ?? 0) >= 70 ? 'text-turkuaz' : 'text-altin' },
              ].map((s) => (
                <div key={s.l} className="bg-surface px-4 py-3.5">
                  <p className={`font-display text-2xl font-semibold ${s.c ?? ''}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {s.v}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{s.l}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-(--radius-card) border border-line bg-line sm:grid-cols-4">
              {[
                { v: tr(ozet.bitenDeneme), l: 'bitirilen deneme' },
                { v: `${tr(ozet.benzersizSoru)}/${tr(questionBank.length)}`, l: `banka (%${tr(ozet.bankaKapsama)})` },
                { v: tr(ozet.calisilanGun), l: 'çalışılan gün' },
                { v: tr(ozet.enUzunSeri), l: 'en uzun seri' },
              ].map((s) => (
                <div key={s.l} className="bg-surface px-4 py-3.5">
                  <p className="font-display text-2xl font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {s.v}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{s.l}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Link to="/cozduklerim" className="rounded-lg border border-line px-3 py-2 hover:border-mercan">
                Çözdüğüm soruları gör →
              </Link>
              {ozet.yanlisHavuzu > 0 && (
                <Link to="/yanlis-havuzu" className="rounded-lg border border-line px-3 py-2 hover:border-kizil">
                  Yanlış havuzu ({tr(ozet.yanlisHavuzu)}) →
                </Link>
              )}
              {ozet.tekrarKarti > 0 && (
                <Link to="/tekrar" className="rounded-lg border border-line px-3 py-2 hover:border-kobalt">
                  Tekrar kartları ({tr(ozet.tekrarKarti)}) →
                </Link>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── Tahmini puan ─────────────────────────────────────────────── */}
      <section className="rise-in mb-6 rounded-(--radius-card) border border-line bg-surface p-6 text-center" style={{ animationDelay: '60ms' }}>
        <p className="mb-1 text-xs tracking-widest text-muted">TAHMİNİ SINAV PUANIN</p>
        {estimate === null ? (
          <p className="mt-3 text-sm text-muted">
            Henüz veri yok —{' '}
            <Link to="/soru-bankasi" className="text-kobalt">
              soru çözmeye başla
            </Link>
            , tahmin burada belirsin.
          </p>
        ) : (
          <>
            <p
              className={['font-display text-6xl font-semibold', estimate >= PASS_SCORE ? 'text-turkuaz' : 'text-altin'].join(' ')}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {tr(estimate)}
            </p>
            <p className="mt-2 text-sm text-muted">
              {estimate >= PASS_SCORE
                ? `Baraj ${PASS_SCORE} — şu an üstündesin! Bu tempoyu koruyan herkes o salondan gülerek çıkar.`
                : `Baraja ${tr(PASS_SCORE - estimate)} puan var — kapanmayacak mesafe değil. Kırmızı konulara yüklendikçe bu sayının yükselişini izleyeceksin.`}
            </p>
          </>
        )}
      </section>

      {/* ── Deneme puanları ──────────────────────────────────────────── */}
      <section className="rise-in mb-6" style={{ animationDelay: '120ms' }}>
        <h2 className="font-display mb-3 text-lg font-semibold">Deneme Puanların</h2>
        {denemeler.length === 0 ? (
          <p className="rounded-(--radius-card) border border-line bg-surface p-6 text-center text-sm text-muted">
            Henüz deneme çözmedin.{' '}
            <Link to="/denemeler" className="text-kobalt">
              İlk denemene gir
            </Link>{' '}
            — grafik burada büyüsün.
          </p>
        ) : (
          <DenemeGrafigi
            kayitlar={denemeler}
            ortalama={ozet.denemeOrtalama}
            enYuksek={ozet.enYuksekDeneme}
          />
        )}
      </section>

      {/* ── Konu doğruluğu ───────────────────────────────────────────── */}
      <section className="rise-in" style={{ animationDelay: '180ms' }}>
        <h2 className="font-display mb-3 text-lg font-semibold">Konu Doğruluğun</h2>
        <div className="space-y-2.5">
          {TOPIC_IDS.map((id) => {
            const t = acc[id];
            const d = dokum.find((x) => x.id === id);
            const pct = t.pct;
            const color = pct === null ? 'var(--line)' : pct >= 70 ? 'var(--turkuaz)' : pct >= 50 ? 'var(--altin)' : 'var(--kizil)';
            return (
              <div key={id}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate">{TOPICS[id].short}</span>
                  <span className="shrink-0 text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {pct === null ? (
                      'veri yok'
                    ) : (
                      <>
                        %{tr(pct)} <span className="text-turkuaz">{tr(d?.dogru ?? 0)}D</span>
                        {' / '}
                        <span className="text-kizil">{tr(d?.yanlis ?? 0)}Y</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-raised">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct ?? 0}%`, background: color }} />
                </div>
                {/*
                  Zayıf konuya doğrudan geçiş. Uygulama hangi konunun zayıf
                  olduğunu biliyordu ama kullanıcıyı oraya götürmüyordu.
                */}
                {pct !== null && pct < 70 && (
                  <Link
                    to={`/sinav/mini-${id}-0`}
                    className="mt-1.5 inline-block text-xs font-medium text-mercan hover:underline"
                  >
                    Bu konuya yüklen — 20 soruluk mini deneme →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/**
 * Deneme puanları — sütun grafiği.
 *
 * Önce çizgi grafiğiydi ama viewBox tam genişliğe esnetildiği için iki denemede
 * noktalar uçlara yapışıyor, aradaki dev boşluk anlamsız duruyor ve baraj etiketi
 * noktanın üstüne biniyordu. Sütun, tek denemede de yirmi denemede de düzgün durur.
 */
function DenemeGrafigi({
  kayitlar,
  ortalama,
  enYuksek,
}: {
  kayitlar: { examId: string; finishedAt: string; score: number }[];
  ortalama: number | null;
  enYuksek: number | null;
}) {
  // Çok fazla deneme birikirse son 12'sini göster — sütunlar okunaklı kalsın
  const gorunen = kayitlar.slice(-12);
  const sonuncu = gorunen[gorunen.length - 1];

  return (
    <div className="rounded-(--radius-card) border border-line bg-surface p-5">
      {/* Özet şerit */}
      <div className="mb-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <span>
          <span className="text-muted">deneme</span>{' '}
          <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{tr(kayitlar.length)}</strong>
        </span>
        {ortalama !== null && (
          <span>
            <span className="text-muted">ortalama</span>{' '}
            <strong className={ortalama >= PASS_SCORE ? 'text-turkuaz' : 'text-altin'} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {tr(ortalama)}
            </strong>
          </span>
        )}
        {enYuksek !== null && (
          <span>
            <span className="text-muted">en yüksek</span>{' '}
            <strong className="text-turkuaz" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {tr(enYuksek)}
            </strong>
          </span>
        )}
        <span>
          <span className="text-muted">baraj</span>{' '}
          <strong className="text-altin" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {PASS_SCORE}
          </strong>
        </span>
      </div>

      {/* Sütunlar — baraj çizgisi arkada yatay şerit olarak */}
      <div className="relative h-44">
        {/* baraj çizgisi */}
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-altin/70"
          style={{ bottom: `${PASS_SCORE}%` }}
        >
          <span className="absolute -top-4 right-0 text-[10px] font-medium text-altin">baraj {PASS_SCORE}</span>
        </div>

        <ul className="flex h-full items-end gap-2">
          {gorunen.map((k, i) => {
            const gecti = k.score >= PASS_SCORE;
            const tarih = new Date(k.finishedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
            return (
              <li key={`${k.examId}-${i}`} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1.5">
                {/*
                  Sütun mutlak konumlandırılır: flex sütun içinde yüzde yükseklik
                  güvenilir çözümlenmiyor ve sütunlar hiç çizilmiyordu.
                  Konumlandırılmış ataya göre yüzde her zaman doğru hesaplanır.
                */}
                {/* Sütun genişliği sınırlı: az deneme varken ekranı kaplayan bloklar oluşuyordu. */}
                <div className="relative mx-auto w-full max-w-[72px] flex-1" title={`${tarih} — ${Math.round(k.score)} puan`}>
                  <div
                    className={`absolute inset-x-0 bottom-0 rounded-t-md transition-[height] duration-700 ${
                      gecti ? 'bg-turkuaz' : 'bg-kizil'
                    }`}
                    style={{ height: `${Math.max(k.score, 3)}%`, opacity: 0.9 }}
                  />
                  <span
                    className={`absolute inset-x-0 text-center text-xs font-semibold ${gecti ? 'text-turkuaz' : 'text-kizil'}`}
                    style={{ bottom: `calc(${Math.max(k.score, 3)}% + 4px)`, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {Math.round(k.score)}
                  </span>
                </div>
                <span className="w-full truncate text-center text-[10px] text-muted">{tarih}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {kayitlar.length > gorunen.length && (
        <p className="mt-3 text-center text-xs text-muted">Son {gorunen.length} deneme gösteriliyor.</p>
      )}

      {sonuncu && (
        <p className="mt-4 border-t border-line pt-3 text-center text-sm text-muted">
          {sonuncu.score >= PASS_SCORE
            ? `Son denemende ${Math.round(sonuncu.score)} aldın — barajın ${Math.round(sonuncu.score - PASS_SCORE)} puan üstünde. Böyle devam.`
            : `Son denemen ${Math.round(sonuncu.score)}. Baraja ${Math.round(PASS_SCORE - sonuncu.score)} puan kaldı — yanlış havuzun tam da bunun için var.`}
        </p>
      )}
    </div>
  );
}
