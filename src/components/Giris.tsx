import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2, LogIn, UserPlus } from 'lucide-react';
import { girisYap, kayitOl, kullaniciAdiGecerliMi, sifreGecerliMi } from '@/lib/supabase';

/**
 * Giriş / kayıt ekranı.
 *
 * Yalnızca kullanıcı adı ve şifre istenir — e-posta yok, doğrulama kodu yok.
 * Amaç ilerlemenin cihazlar arasında taşınması; kayıt sürtünmesi mümkün olan
 * en aza indirildi.
 */
/**
 * Bu cihazda daha önce giriş yapılmış mı?
 *
 * Senkron katmanı, oturum açan kullanıcının kimliğini buraya yazıyor. Kayıt
 * varsa bu bir dönüş, yoksa ilk karşılaşma — açılışta hangi sekmenin önde
 * duracağını bu belirliyor. İlk kez gelen birine "Giriş yap" göstermek,
 * olmayan bir hesabı sormak demek.
 */
function ilkKezMi(): boolean {
  return localStorage.getItem('mks:senkron-kullanici') === null;
}

export function Giris({ onBasarili, onAtla }: { onBasarili: () => void; onAtla: () => void }) {
  const [mod, setMod] = useState<'giris' | 'kayit'>(() => (ilkKezMi() ? 'kayit' : 'giris'));
  const [ad, setAd] = useState('');
  const [sifre, setSifre] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata(null);

    const adHata = kullaniciAdiGecerliMi(ad.trim());
    if (adHata) return setHata(adHata);
    const sifreHata = sifreGecerliMi(sifre);
    if (sifreHata) return setHata(sifreHata);

    setBekliyor(true);
    const sonuc = mod === 'giris' ? await girisYap(ad.trim(), sifre) : await kayitOl(ad.trim(), sifre);
    setBekliyor(false);

    if (sonuc.ok) onBasarili();
    else setHata(sonuc.hata ?? 'Bir şeyler ters gitti.');
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-ground px-6 py-10 text-ink">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <p className="font-display text-3xl font-semibold tracking-tight">MKS</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-muted">Çalışma Odası</p>
        </div>

        <div className="rounded-(--radius-card) border border-line bg-surface p-6">
          {/* Mod seçici */}
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-raised p-1">
            {(['giris', 'kayit'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMod(m);
                  setHata(null);
                }}
                className={`rounded-md py-2 text-sm font-medium transition-colors ${
                  mod === m ? 'bg-surface text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {m === 'giris' ? 'Giriş yap' : 'Kayıt ol'}
              </button>
            ))}
          </div>

          <form onSubmit={gonder} className="space-y-4">
            <div>
              <label htmlFor="ad" className="mb-1.5 block text-xs font-medium text-muted">
                Kullanıcı adı
              </label>
              <input
                id="ad"
                value={ad}
                onChange={(e) => setAd(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="duygu"
                className="w-full rounded-lg border border-line bg-ground px-3 py-2.5 text-sm outline-none focus:border-mercan"
              />
            </div>

            <div>
              <label htmlFor="sifre" className="mb-1.5 block text-xs font-medium text-muted">
                Şifre
              </label>
              <input
                id="sifre"
                type="password"
                value={sifre}
                onChange={(e) => setSifre(e.target.value)}
                autoComplete={mod === 'giris' ? 'current-password' : 'new-password'}
                placeholder="en az 6 karakter"
                className="w-full rounded-lg border border-line bg-ground px-3 py-2.5 text-sm outline-none focus:border-mercan"
              />
            </div>

            <AnimatePresence>
              {hata && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2 rounded-lg bg-kizil/10 p-3 text-xs text-kizil"
                  role="alert"
                >
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  {hata}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={bekliyor}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-mercan px-4 py-3 text-sm font-semibold text-mercan-ink disabled:opacity-60"
            >
              {bekliyor ? (
                <Loader2 className="size-4 animate-spin" />
              ) : mod === 'giris' ? (
                <LogIn className="size-4" />
              ) : (
                <UserPlus className="size-4" />
              )}
              {bekliyor ? 'Bekle…' : mod === 'giris' ? 'Giriş yap' : 'Hesap oluştur'}
            </button>
          </form>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
            E-posta istemiyoruz, doğrulama kodu göndermiyoruz. Kullanıcı adı ve şifre yeterli —
            ilerlemen telefonda ve bilgisayarda aynı yerden devam etsin diye.
            <br />
            <span className="mt-1 inline-block">Bir kez kayıt ol; bu cihaz seni bir daha şifre sormadan tanır.</span>
          </p>
        </div>

        <button
          type="button"
          onClick={onAtla}
          className="mt-4 w-full text-center text-xs text-muted hover:text-ink"
        >
          Şimdilik girmeden devam et — ilerleme yalnızca bu cihazda kalır
        </button>
      </motion.div>
    </div>
  );
}
