import { useEffect, useState } from 'react';
import { LogIn, LogOut, UserRound } from 'lucide-react';
import { cikisYap, GIRISE_DON, kullaniciAdi, oturumIzle, supabaseVar } from '@/lib/supabase';
import { SenkronRozeti } from '@/components/SenkronRozeti';

/**
 * Ayarlardaki hesap bölümü.
 *
 * Giriş yapılmadıysa ne olduğunu açıkça söyler — "ilerleme yalnızca bu
 * cihazda" cümlesi, telefonda çalışıp bilgisayarda bulamama sürprizini
 * baştan önlüyor.
 */
export function Hesap() {
  const [ad, setAd] = useState<string | null>(null);
  const [cikiliyor, setCikiliyor] = useState(false);

  useEffect(() => {
    if (!supabaseVar) return;
    return oturumIzle((o) => setAd(o ? kullaniciAdi(o) : null));
  }, []);

  if (!supabaseVar) return null;

  return (
    <section className="rise-in mb-6">
      <h2 className="mb-2 text-sm font-medium text-muted">Hesap</h2>
      <div className="rounded-(--radius-card) border border-line bg-surface p-5">
        {ad ? (
          <>
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-raised" aria-hidden>
                <UserRound size={17} className="text-muted" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{ad}</p>
                <SenkronRozeti ayrintili />
              </div>
              <button
                type="button"
                disabled={cikiliyor}
                onClick={() => {
                  setCikiliyor(true);
                  void cikisYap();
                }}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs disabled:opacity-60"
              >
                <LogOut size={13} aria-hidden />
                Çıkış
              </button>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              İlerlemen hesabına kaydediliyor. Telefondan girdiğinde aynı yerden devam edersin.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-muted">
              Giriş yapılmadı — ilerlemen yalnızca bu cihazda kalıyor. Hesap açarsan telefonda ve bilgisayarda aynı
              noktadan devam edebilirsin.
            </p>
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('mks:girisAtlandi');
                window.dispatchEvent(new Event(GIRISE_DON));
              }}
              className="mt-4 flex items-center gap-1.5 rounded-full bg-mercan px-4 py-2.5 text-sm font-semibold text-mercan-ink"
            >
              <LogIn size={15} aria-hidden />
              Giriş yap veya hesap aç
            </button>
          </>
        )}
      </div>
    </section>
  );
}
