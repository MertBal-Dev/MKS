import { useCallback, useEffect, useState } from 'react';
import { Giris } from '@/components/Giris';
import { GIRISE_DON, oturumAl, oturumIzle, supabaseVar } from '@/lib/supabase';
import { AnimatePresence, motion } from 'framer-motion';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AppStateProvider } from '@/hooks/useAppState';
import { AiHocaProvider } from '@/hooks/useAiHoca';
import { MotivasyonProvider } from '@/hooks/useMotivasyon';
import { AppShell } from '@/components/AppShell';
import { AiHocaPanel } from '@/components/AiHocaPanel';
import { BackupReminder } from '@/components/BackupReminder';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DuyguIntro } from '@/components/DuyguIntro';
import Dashboard from '@/pages/Dashboard';
import Konular from '@/pages/Konular';
import KonuDetay from '@/pages/KonuDetay';
import SoruBankasi from '@/pages/SoruBankasi';
import Pratik from '@/pages/Pratik';
import Cozduklerim from '@/pages/Cozduklerim';
import KendiSorularim from '@/pages/KendiSorularim';
import SoruAileleri from '@/pages/SoruAileleri';
import GunlukDenemeler from '@/pages/GunlukDenemeler';
import Denemeler from '@/pages/Denemeler';
import SinavOdasi from '@/pages/SinavOdasi';
import SinavSonuc from '@/pages/SinavSonuc';
import Tekrar from '@/pages/Tekrar';
import YanlisHavuzu from '@/pages/YanlisHavuzu';
import Istatistik from '@/pages/Istatistik';
import Plan from '@/pages/Plan';
import Ayarlar from '@/pages/Ayarlar';
import AiHocaPage from '@/pages/AiHoca';

/** Rota değişimlerinde içeriği yumuşakça değiştirir. */
function AnimatedRoutes() {
  const location = useLocation();
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, y: -6 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/konular" element={<Konular />} />
          <Route path="/konular/:topicId" element={<KonuDetay />} />
          <Route path="/soru-bankasi" element={<SoruBankasi />} />
          <Route path="/pratik" element={<Pratik />} />
          <Route path="/cozduklerim" element={<Cozduklerim />} />
          <Route path="/kendi-sorularim" element={<KendiSorularim />} />
          <Route path="/soru-aileleri" element={<SoruAileleri />} />
          <Route path="/gunluk-denemeler" element={<GunlukDenemeler />} />
          <Route path="/ai-hoca" element={<AiHocaPage />} />
          <Route path="/denemeler" element={<Denemeler />} />
          <Route path="/sinav/:examId" element={<SinavOdasi />} />
          <Route path="/sinav/:examId/sonuc" element={<SinavSonuc />} />
          <Route path="/tekrar" element={<Tekrar />} />
          <Route path="/yanlis-havuzu" element={<YanlisHavuzu />} />
          <Route path="/istatistik" element={<Istatistik />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/ayarlar" element={<Ayarlar />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

/** Bu sekmede giriş ekranı atlandı mı. */
const ATLA_ANAHTARI = 'mks:girisAtlandi';

/**
 * Oturum kapısı.
 *
 * Supabase yapılandırılmamışsa ya da kullanıcı "girmeden devam et" derse
 * uygulama eskisi gibi yalnızca localStorage ile çalışır — giriş zorunlu
 * değil, ilerlemeyi cihazlar arasında taşımak isteyene sunulan bir seçenek.
 */
function OturumKapisi({ children }: { children: React.ReactNode }) {
  const [durum, setDurum] = useState<'yukleniyor' | 'acik' | 'kapali'>(
    supabaseVar ? 'yukleniyor' : 'acik',
  );
  // Atlama yalnızca bu sekme için geçerli; bir sonraki açılışta giriş yeniden
  // önerilir. Başarılı girişte bu bayrak YAZILMAZ — yazılsaydı çıkış yapan
  // kullanıcı giriş ekranına bir daha dönemezdi.
  const [atlandi, setAtlandi] = useState(() => Boolean(sessionStorage.getItem(ATLA_ANAHTARI)));

  useEffect(() => {
    if (!supabaseVar) return;
    let iptal = false;
    void oturumAl().then((s) => {
      if (!iptal) setDurum(s ? 'acik' : 'kapali');
    });
    const birak = oturumIzle((s) => setDurum(s ? 'acik' : 'kapali'));
    return () => {
      iptal = true;
      birak();
    };
  }, []);

  // Kullanıcı Ayarlar'dan "giriş yap" derse atlama iptal edilir.
  useEffect(() => {
    const geriDon = () => setAtlandi(false);
    window.addEventListener(GIRISE_DON, geriDon);
    return () => window.removeEventListener(GIRISE_DON, geriDon);
  }, []);

  if (durum === 'yukleniyor' && !atlandi) return <div className="min-h-dvh bg-ground" />;
  if (durum === 'kapali' && !atlandi) {
    return (
      <Giris
        onBasarili={() => setDurum('acik')}
        onAtla={() => {
          sessionStorage.setItem(ATLA_ANAHTARI, '1');
          setAtlandi(true);
        }}
      />
    );
  }
  return <>{children}</>;
}

export default function App() {
  // İlk render'da okunur; aksi halde perde bir kare boyunca görünüp kaybolur.
  const [showIntro, setShowIntro] = useState(
    () => typeof window !== 'undefined' && !sessionStorage.getItem('hasSeenIntro'),
  );

  const handleIntroComplete = useCallback(() => {
    sessionStorage.setItem('hasSeenIntro', 'true');
    setShowIntro(false);
  }, []);

  return (
    <ErrorBoundary>
      {/*
        Perde giriş kapısının ÜSTÜNDE duruyor: Duygu önce karşılamayı görsün,
        arkasında hazırlanan kayıt ekranı perde kalkınca ortaya çıksın.
        Tam ekran bir katman olduğu için altındaki her şey normal yüklenir.
      */}
      {showIntro && <DuyguIntro onComplete={handleIntroComplete} />}
      <OturumKapisi>
        <AppStateProvider>
          <AiHocaProvider>
          <BrowserRouter>
            <MotivasyonProvider>
              <AppShell>
                <AnimatedRoutes />
              </AppShell>
              <AiHocaPanel />
              <BackupReminder />
            </MotivasyonProvider>
            </BrowserRouter>
          </AiHocaProvider>
        </AppStateProvider>
      </OturumKapisi>
    </ErrorBoundary>
  );
}
