import { useRef, useState } from 'react';
import { Download, Moon, RotateCcw, Sun, SunMoon, Upload } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useAppState } from '@/hooks/useAppState';
import { exportState, importState, resetState } from '@/lib/storage';
import { EXAM_DURATION_MIN, EXAM_QUESTION_COUNT, PASS_SCORE } from '@/lib/constants';

const THEMES = [
  { value: 'dark', label: 'Koyu', icon: Moon },
  { value: 'light', label: 'Açık', icon: Sun },
  { value: 'system', label: 'Sistem', icon: SunMoon },
] as const;

const COUNTDOWN_MODES = [
  { value: 'soft', label: 'Yumuşak', desc: 'Günlük hedef halkası + sakin tarih rozeti (önerilen)' },
  { value: 'full', label: 'Tam', desc: 'Büyük gün sayacı — motivasyonu sayaçtan alanlar için' },
  { value: 'hidden', label: 'Gizli', desc: 'Ana sayfada tarih/sayaç hiç görünmez' },
] as const;

export default function Ayarlar() {
  const { state, update, replace } = useAppState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const download = () => {
    const blob = new Blob([exportState()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mks-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    update((s) => ({ ...s, lastBackup: new Date().toISOString().slice(0, 10) }));
    setMessage({ kind: 'ok', text: 'Yedek indirildi. Bu dosyayla ilerlemeni başka cihaza taşıyabilirsin.' });
  };

  const upload = async (file: File) => {
    try {
      const imported = importState(await file.text());
      replace(imported);
      setMessage({ kind: 'ok', text: 'Yedek yüklendi — ilerlemen geri geldi.' });
    } catch {
      setMessage({ kind: 'error', text: 'Bu dosya bir MKS yedeği değil veya bozuk. Doğru dosyayı seçtiğinden emin ol.' });
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Ayarlar" />

      {/* Tema */}
      <section className="rise-in mb-6">
        <h2 className="mb-2 text-sm font-medium text-muted">Görünüm</h2>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => update((s) => ({ ...s, settings: { ...s.settings, theme: value } }))}
              aria-pressed={state.settings.theme === value}
              className={[
                'flex flex-col items-center gap-1.5 rounded-(--radius-card) border px-4 py-4 text-sm transition-colors',
                state.settings.theme === value
                  ? 'border-mercan bg-mercan/10 font-medium text-mercan'
                  : 'border-line bg-surface text-muted',
              ].join(' ')}
            >
              <Icon size={20} aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Geri sayım görünümü */}
      <section className="rise-in mb-6" style={{ animationDelay: '40ms' }}>
        <h2 className="mb-2 text-sm font-medium text-muted">Geri sayım görünümü</h2>
        <div className="space-y-2">
          {COUNTDOWN_MODES.map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => update((s) => ({ ...s, settings: { ...s.settings, countdown: value } }))}
              aria-pressed={state.settings.countdown === value}
              className={[
                'flex w-full items-center justify-between gap-3 rounded-(--radius-card) border px-5 py-3.5 text-left transition-colors',
                state.settings.countdown === value
                  ? 'border-mercan bg-mercan/10'
                  : 'border-line bg-surface hover:bg-raised',
              ].join(' ')}
            >
              <span>
                <span className={['block font-medium', state.settings.countdown === value ? 'text-mercan' : ''].join(' ')}>
                  {label}
                </span>
                <span className="text-xs text-muted">{desc}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Veri */}
      <section className="rise-in mb-6" style={{ animationDelay: '60ms' }}>
        <h2 className="mb-2 text-sm font-medium text-muted">Verin</h2>
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={download}
            className="flex w-full items-center gap-3 rounded-(--radius-card) border border-line bg-surface px-5 py-4 text-left transition-colors hover:bg-raised"
          >
            <Download size={19} className="text-kobalt" aria-hidden />
            <span>
              <span className="block font-medium">Verini indir</span>
              <span className="text-xs text-muted">Tüm ilerlemen tek JSON dosyasında</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center gap-3 rounded-(--radius-card) border border-line bg-surface px-5 py-4 text-left transition-colors hover:bg-raised"
          >
            <Upload size={19} className="text-turkuaz" aria-hidden />
            <span>
              <span className="block font-medium">Yedekten yükle</span>
              <span className="text-xs text-muted">Telefon ↔ bilgisayar taşımak için</span>
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="flex w-full items-center gap-3 rounded-(--radius-card) border border-kizil/40 bg-surface px-5 py-4 text-left text-kizil transition-colors hover:bg-kizil/10"
          >
            <RotateCcw size={19} aria-hidden />
            <span>
              <span className="block font-medium">Her şeyi sıfırla</span>
              <span className="text-xs opacity-70">İlerleme, istatistik ve plan işaretleri silinir</span>
            </span>
          </button>
        </div>
        {message && (
          <p className={['mt-3 rounded-xl px-4 py-3 text-sm', message.kind === 'ok' ? 'bg-turkuaz/10 text-turkuaz' : 'bg-kizil/10 text-kizil'].join(' ')}>
            {message.text}
          </p>
        )}
      </section>

      {/* Hakkında */}
      <section className="rise-in rounded-(--radius-card) border border-line bg-surface p-5 text-sm leading-relaxed text-muted" style={{ animationDelay: '120ms' }}>
        <h2 className="font-display mb-2 text-base font-semibold text-ink">Sınav Hakkında</h2>
        <p>
          Mesleğe Kabul Sınavı (MKS), 6326 sayılı Turist Rehberliği Meslek Kanunu kapsamında Kültür ve Turizm
          Bakanlığı adına Anadolu Üniversitesi tarafından yapılır. {EXAM_QUESTION_COUNT} soru, {EXAM_DURATION_MIN} dakika;
          baraj {PASS_SCORE} puandır ve yanlış doğruyu götürmez.
        </p>
        <p className="mt-2">
          Resmi duyurular:{' '}
          <a href="https://www.ktb.gov.tr" target="_blank" rel="noreferrer" className="text-kobalt">
            ktb.gov.tr
          </a>{' '}
          •{' '}
          <a href="https://www.anadolu.edu.tr" target="_blank" rel="noreferrer" className="text-kobalt">
            anadolu.edu.tr
          </a>
        </p>
        <p className="mt-2 text-xs">
          Bu uygulama kişisel çalışma amaçlıdır; sorular özgün olarak hazırlanmıştır, resmi sınav soruları değildir.
        </p>
      </section>

      {/* Sıfırlama onayı */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 grid place-items-center p-6" role="dialog" aria-modal="true">
          <button type="button" aria-label="Vazgeç" className="absolute inset-0 bg-black/60" onClick={() => setConfirmReset(false)} />
          <div className="rise-in relative w-full max-w-sm rounded-(--radius-card) border border-line bg-surface p-6 text-center">
            <h2 className="font-display mb-2 text-lg font-semibold">Her şey silinsin mi?</h2>
            <p className="mb-5 text-sm text-muted">Bu işlem geri alınamaz. Önce yedek indirmek isteyebilirsin.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmReset(false)} className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm">
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  replace(resetState());
                  setConfirmReset(false);
                  setMessage({ kind: 'ok', text: 'Temiz sayfa açıldı. Kolay gelsin!' });
                }}
                className="flex-1 rounded-full bg-kizil px-4 py-2.5 text-sm font-semibold text-white"
              >
                Evet, sıfırla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
